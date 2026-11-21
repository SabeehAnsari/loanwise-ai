import os
import sys

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Make sibling modules importable regardless of the working directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from auth import get_current_user
from bias_agent import build_fairness_gate, load_model_report
from database import get_user_applications, save_application
from email_agent import generate_validated_email
from email_sender import send_loan_email
from marketing_agent import build_final_email, run_marketing_agent
from rules import check_business_rules
from scoring import load_model, score_application

# ── App Setup ──────────────────────────────────────────────
app = FastAPI(
    title="LoanWise AI API",
    description="AI-powered loan approval pipeline with fairness auditing, explanations and guarded LLM emails",
    version="1.1.0"
)

# Rate limiting (per client IP) to protect the paid OpenAI and email calls
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Only the configured frontend origin(s) may call the API (comma-separated)
ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Loaded once at startup: the model and its offline fairness audit
model = load_model()
MODEL_REPORT = load_model_report()
FAIRNESS_GATE = build_fairness_gate(MODEL_REPORT)


# ── Request Schema ─────────────────────────────────────────
class LoanApplication(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    gender: int = Field(ge=0, le=1)              # 1 = Male, 0 = Female (audit only, not a model input)
    married: int = Field(ge=0, le=1)             # 1 = Yes, 0 = No (audit only, not a model input)
    dependents: int = Field(ge=0, le=3)          # 3 means 3+
    education: int = Field(ge=0, le=1)           # 1 = Graduate, 0 = Not Graduate
    self_employed: int = Field(ge=0, le=1)       # 1 = Yes, 0 = No
    applicant_income: float = Field(ge=0, le=10_000_000)
    coapplicant_income: float = Field(ge=0, le=10_000_000)
    loan_amount: float = Field(ge=0, le=1_000_000)   # in thousands; business rules apply the real cap
    loan_amount_term: float = Field(gt=0, le=600)    # in months
    credit_history: float = Field(ge=0, le=1)        # 1.0 = Good, 0.0 = Poor
    property_area: int = Field(ge=0, le=2)           # 0 = Rural, 1 = Semiurban, 2 = Urban


def decision_label(prediction: int) -> str:
    return "APPROVED" if prediction == 1 else "DENIED"


def persist(user: dict, application: LoanApplication, result: dict) -> None:
    """Save every processed application and attach its id to the result.
    A failed save never fails the request (application_id is then None)."""
    result["application_id"] = None
    try:
        saved = save_application(
            user_id=user["id"],
            user_email=user["email"],
            form_data=application.model_dump(),
            user_token=user["token"],
            result=result,
        )
        if isinstance(saved, dict):
            result["application_id"] = saved.get("id")
    except Exception as e:
        print(f"Database save failed: {e}")


# ── Routes ─────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "LoanWise AI API is running",
        "version": app.version,
        "endpoints": ["/predict", "/health", "/model"]
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/model")
def model_info():
    """Public model card: features used, cross-validated metrics and fairness audit."""
    return MODEL_REPORT


@app.post("/predict")
@limiter.limit("10/minute")
def predict(request: Request, application: LoanApplication, user: dict = Depends(get_current_user)):
    """
    Main pipeline endpoint:
    0. Hard business rules
    1. XGBoost scoring + per-applicant SHAP explanation
    2. Fairness gate (model-level audit, computed offline)
    3. Email generation with guardrails
    4. Product recommendations
    5. Send email and persist
    """
    app_dict = application.model_dump()

    # ── Step 0: Hard Business Rules ────────────────────────
    rejection = check_business_rules(app_dict)
    if rejection:
        result = {
            "status": "REJECTED_BY_RULES",
            "decision": "DENIED",
            "probability": None,
            "message": rejection,
            "explanation": [],
            "bias_report": None,
            "email": None,
            "marketing": None,
        }
        persist(user, application, result)
        return result

    # ── Step 1: Score + Explain ────────────────────────────
    scored = score_application(model, app_dict)
    prediction = scored["prediction"]
    probability = round(scored["probability"], 4)
    explanation = scored["explanation"]

    # ── Step 2: Fairness Gate ──────────────────────────────
    if FAIRNESS_GATE["needs_human_review"]:
        result = {
            "status": "HUMAN_REVIEW",
            "decision": "PENDING",
            "probability": probability,
            "message": "Automated decisions are disabled: the deployed model failed its fairness audit",
            "explanation": explanation,
            "bias_report": FAIRNESS_GATE,
            "email": None,
            "marketing": None,
        }
        persist(user, application, result)
        return result

    # ── Step 3: Email Generation ───────────────────────────
    email_data = {
        "name": application.name,
        "loan_amount": application.loan_amount,
        "loan_term": application.loan_amount_term,
        "self_employed": application.self_employed,
        "education": application.education,
        "credit_history": application.credit_history,
        "property_area": application.property_area
    }
    email_result = generate_validated_email(email_data, prediction)

    if email_result["status"] == "HUMAN_REVIEW":
        result = {
            "status": "HUMAN_REVIEW",
            "decision": decision_label(prediction),
            "probability": probability,
            "message": "Email flagged for human review after failing guardrails",
            "explanation": explanation,
            "bias_report": FAIRNESS_GATE,
            "email": {"status": "HUMAN_REVIEW", "attempts": email_result["attempts"], "body": None},
            "marketing": None,
        }
        persist(user, application, result)
        return result

    # ── Step 4: Marketing Recommendations ─────────────────
    total_income = application.applicant_income + application.coapplicant_income
    marketing_result = run_marketing_agent({
        "name": application.name,
        "total_income": total_income,
        "credit_history": application.credit_history,
        "self_employed": application.self_employed,
        "education": application.education,
        "loan_amount": application.loan_amount,
        "loan_term": application.loan_amount_term,
        "property_area": application.property_area
    }, prediction)

    final_email = build_final_email(email_result["email"], marketing_result["recommendation_text"])

    # ── Step 5: Send Email + Persist ──────────────────────
    email_send_result = {"sent": False, "recipient": None, "error": "No email address on account"}
    if user["email"] and final_email:
        email_send_result = send_loan_email(
            applicant_email=user["email"],
            applicant_name=application.name,
            decision=decision_label(prediction),
            email_body=final_email
        )

    result = {
        "status": "SUCCESS",
        "decision": decision_label(prediction),
        "probability": probability,
        "explanation": explanation,
        "bias_report": FAIRNESS_GATE,
        "email": {
            "status": email_result["status"],
            "attempts": email_result["attempts"],
            "body": final_email,
            "sent": email_send_result["sent"],
            "recipient": email_send_result["recipient"] if email_send_result["sent"] else None
        },
        "marketing": {
            "eligible_products": marketing_result["eligible_products"],
            "product_count": marketing_result["product_count"]
        }
    }
    persist(user, application, result)
    return result


@app.get("/applications/{user_id}")
def get_applications(user_id: str, user: dict = Depends(get_current_user)):
    """
    Returns all applications submitted by the authenticated user.
    """
    if user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed to view these applications")
    try:
        applications = get_user_applications(user["id"], user["token"])
        return {"applications": applications}
    except Exception:
        return {"applications": [], "error": "Failed to load applications"}
