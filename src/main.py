import os
import sys

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Literal

from pydantic import BaseModel, Field
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# Make sibling modules importable regardless of the working directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from auth import get_current_user
from bias_agent import build_fairness_gate
from database import get_user_applications, save_application
from email_agent import generate_validated_email
from email_sender import send_loan_email
from marketing_agent import build_final_email, run_marketing_agent
from rules import check_business_rules
from scoring import load_card, load_model, score_application

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)
from ml.serving import LOAN_TYPES, MODEL_VERSION, derived  # noqa: E402

# ── App Setup ──────────────────────────────────────────────
app = FastAPI(
    title="LoanWise AI API",
    description="AI-powered loan approval pipeline with fairness auditing, explanations and guarded LLM emails",
    version="2.0.0"
)

# Rate limiting (per client IP) to protect the paid OpenAI and email calls
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Only the configured frontend origin(s) may call the API (comma-separated)
ALLOWED_ORIGINS = [
    o.strip().rstrip("/")
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

# Loaded once at startup: the v2 model, its card (metrics, threshold, offline fairness audit)
model = load_model()
MODEL_CARD = load_card()
THRESHOLD = MODEL_CARD["policy"]["threshold"]
FAIRNESS_GATE = build_fairness_gate(MODEL_CARD)


# ── Request Schema ─────────────────────────────────────────
NOT_PROVIDED = "Not provided"


class LoanApplication(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    loan_amount: float = Field(gt=0, le=10_000_000)          # dollars
    property_value: float = Field(gt=0, le=20_000_000)       # dollars
    annual_income: float = Field(ge=0, le=10_000_000)        # household, before tax
    monthly_debts: float = Field(ge=0, le=1_000_000)         # existing debt payments (car, cards, student)
    loan_term: int = Field(ge=60, le=480)                    # months
    loan_type: Literal[tuple(LOAN_TYPES)]
    has_coapplicant: bool
    # Fairness monitoring only: never model inputs (HMDA categories, all optional)
    sex: Literal["Male", "Female", NOT_PROVIDED] = NOT_PROVIDED
    race: Literal["White", "Black or African American", "Asian", "American Indian or Alaska Native",
                  "Native Hawaiian or Other Pacific Islander", "Two or more races", NOT_PROVIDED] = NOT_PROVIDED
    ethnicity: Literal["Hispanic or Latino", "Not Hispanic or Latino", NOT_PROVIDED] = NOT_PROVIDED
    age: Literal["<25", "25-34", "35-44", "45-54", "55-64", "65-74", ">74", NOT_PROVIDED] = NOT_PROVIDED


def shown_derived(app: dict) -> dict:
    """Derived numbers returned to the app (rounded, JSON-safe)."""
    d = derived(app)
    return {"dti": round(d["dti"], 2), "ltv": round(d["ltv"], 2),
            "monthly_payment": round(d["monthly_payment"], 2), "conforming": d["conforming"]}


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
        "model_version": MODEL_VERSION,
        "endpoints": ["/predict", "/health", "/model"]
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/model")
def model_info():
    """Public model card: data, metrics, operating threshold, fairness audit and robustness."""
    return MODEL_CARD


@app.post("/predict")
@limiter.limit("10/minute")
def predict(request: Request, application: LoanApplication, user: dict = Depends(get_current_user)):
    """
    Main pipeline endpoint (v2):
    0. Hard business rules
    1. XGBoost scoring + per-applicant SHAP explanation
    2. Fairness gate (model-level audit, computed offline)
    3. Auto-approve if the score clears the operating threshold, otherwise refer to a loan officer
       (the model never denies)
    4. Guarded LLM letter, 5. rule-based products, 6. send email and persist
    """
    app_dict = application.model_dump()
    base = {"model_version": MODEL_VERSION, "threshold": THRESHOLD, "derived": shown_derived(app_dict)}

    # ── Step 0: Hard Business Rules ────────────────────────
    rejection = check_business_rules(app_dict)
    if rejection:
        result = {**base, "status": "REJECTED_BY_RULES", "decision": "DENIED", "probability": None,
                  "message": rejection, "explanation": [], "bias_report": None, "email": None, "marketing": None}
        persist(user, application, result)
        return result

    # ── Step 1: Score + Explain ────────────────────────────
    scored = score_application(model, app_dict, THRESHOLD)
    probability = round(scored["probability"], 4)
    explanation = scored["explanation"]

    # ── Step 2: Fairness Gate ──────────────────────────────
    if FAIRNESS_GATE["needs_human_review"]:
        result = {**base, "status": "HUMAN_REVIEW", "decision": "PENDING", "probability": probability,
                  "message": "Automated decisions are disabled: the deployed model failed its fairness audit",
                  "explanation": explanation, "bias_report": FAIRNESS_GATE, "email": None, "marketing": None}
        persist(user, application, result)
        return result

    # ── Step 3: Auto-approve or refer ──────────────────────
    decision = "APPROVED" if scored["auto_approve"] else "REFERRED"
    message = None if decision == "APPROVED" else (
        f"Approval probability {probability:.1%} is below the auto-approve threshold of {THRESHOLD:.0%}; "
        "a loan officer will review the application")

    # ── Step 4: Email Generation ───────────────────────────
    profile = {**app_dict, **base["derived"]}
    email_result = generate_validated_email(app_dict, decision)
    if email_result["status"] == "HUMAN_REVIEW":
        result = {**base, "status": "HUMAN_REVIEW", "decision": decision, "probability": probability,
                  "message": "Email flagged for human review after failing guardrails",
                  "explanation": explanation, "bias_report": FAIRNESS_GATE,
                  "email": {"status": "HUMAN_REVIEW", "attempts": email_result["attempts"], "body": None},
                  "marketing": None}
        persist(user, application, result)
        return result

    # ── Step 5: Product Recommendations ───────────────────
    marketing_result = run_marketing_agent(profile, decision)
    final_email = build_final_email(email_result["email"], marketing_result["recommendation_text"])

    # ── Step 6: Send Email + Persist ──────────────────────
    email_send_result = {"sent": False, "recipient": None, "error": "No email address on account"}
    if user["email"] and final_email:
        email_send_result = send_loan_email(applicant_email=user["email"], applicant_name=application.name,
                                            decision=decision, email_body=final_email)

    result = {
        **base,
        "status": "SUCCESS",
        "decision": decision,
        "probability": probability,
        "message": message,
        "explanation": explanation,
        "bias_report": FAIRNESS_GATE,
        "email": {
            "status": email_result["status"],
            "attempts": email_result["attempts"],
            "body": final_email,
            "sent": email_send_result["sent"],
            "recipient": email_send_result["recipient"] if email_send_result["sent"] else None,
        },
        "marketing": {"eligible_products": marketing_result["eligible_products"],
                      "product_count": marketing_result["product_count"]},
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
