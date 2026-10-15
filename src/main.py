from fastapi import Depends, FastAPI, HTTPException, Request
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import numpy as np
import os
import sys
from auth import get_current_user
from database import save_application, get_user_applications
from email_sender import send_loan_email

# Add src to path so agents can be imported
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from bias_agent import run_bias_agent
from email_agent import generate_validated_email
from marketing_agent import run_marketing_agent, build_final_email

# ── App Setup ──────────────────────────────────────────────
app = FastAPI(
    title="LoanWise AI API",
    description="AI-powered loan approval pipeline with bias detection and personalized emails",
    version="1.0.0"
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

# Load model once at startup
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'src', 'loan_model.pkl')
model = joblib.load(MODEL_PATH)

def validate_application(app) -> dict | None:
    """
    Hard business rules that run before the ML model.
    Returns an error dict if validation fails, None if all checks pass.
    
    Rules mirror real-world lending criteria:
    - Minimum income requirement
    - Maximum loan amount
    - Debt-to-income ratio cap
    - Loan amount must be positive
    """
    total_income = app.applicant_income + app.coapplicant_income

    # Rule 1: Minimum income
    if total_income < 500:
        return {
            "status": "REJECTED_BY_RULES",
            "decision": "DENIED",
            "probability": 0.0,
            "message": "Application rejected: minimum combined monthly income requirement is $500",
            "bias_report": None,
            "email": None,
            "marketing": None
        }

    # Rule 2: Maximum loan amount
    if app.loan_amount > 10000:
        return {
            "status": "REJECTED_BY_RULES",
            "decision": "DENIED",
            "probability": 0.0,
            "message": "Application rejected: maximum loan amount is $10,000,000 (10,000 thousands)",
            "bias_report": None,
            "email": None,
            "marketing": None
        }

    # Rule 3: Loan amount must be positive
    if app.loan_amount <= 0:
        return {
            "status": "REJECTED_BY_RULES",
            "decision": "DENIED",
            "probability": 0.0,
            "message": "Application rejected: loan amount must be greater than zero",
            "bias_report": None,
            "email": None,
            "marketing": None
        }

    # Rule 4: Debt-to-income ratio
    if app.loan_amount_term > 0:
        estimated_monthly = (app.loan_amount * 1000) / app.loan_amount_term
        dti = estimated_monthly / total_income
        if dti > 0.60:
            return {
                "status": "REJECTED_BY_RULES",
                "decision": "DENIED",
                "probability": 0.0,
                "message": f"Application rejected: estimated debt-to-income ratio of {dti:.1%} exceeds maximum allowed 60%",
                "bias_report": None,
                "email": None,
                "marketing": None
            }

    return None


# ── Request Schema ─────────────────────────────────────────
class LoanApplication(BaseModel):
    name: str
    gender: int                # 1 = Male, 0 = Female
    married: int               # 1 = Yes, 0 = No
    dependents: int            # 0, 1, 2, 3
    education: int             # 1 = Graduate, 0 = Not Graduate
    self_employed: int         # 1 = Yes, 0 = No
    applicant_income: float
    coapplicant_income: float
    loan_amount: float         # in thousands
    loan_amount_term: float    # in months
    credit_history: float      # 1.0 = Good, 0.0 = Poor
    property_area: int         # 0, 1, 2


# ── Helper: Preprocess Input ───────────────────────────────
def preprocess_input(app: LoanApplication) -> np.ndarray:
    """
    Applies the same feature engineering as Phase 2
    so the model receives data in the exact format it was trained on.
    """
    import numpy as np

    total_income = app.applicant_income + app.coapplicant_income
    income_to_loan_ratio = total_income / app.loan_amount if app.loan_amount > 0 else 0
    total_income_log = np.log1p(total_income)
    loan_amount_log = np.log1p(app.loan_amount)

    # Must match exact column order from Phase 2 processed data
    features = np.array([[
        app.gender,
        app.married,
        app.dependents,
        app.education,
        app.self_employed,
        app.loan_amount_term,
        app.credit_history,
        app.property_area,
        income_to_loan_ratio,
        total_income_log,
        loan_amount_log
    ]])

    return features


# ── Routes ─────────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "message": "LoanWise AI API is running",
        "version": "1.0.0",
        "endpoints": ["/predict", "/health"]
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/predict")
@limiter.limit("10/minute")
def predict(request: Request, application: LoanApplication, user: dict = Depends(get_current_user)):
    """
    Main pipeline endpoint. Runs:
    1. Feature preprocessing
    2. XGBoost prediction
    3. Bias detection agent
    4. Email generation agent (with guardrails)
    5. Marketing recommendation agent
    6. Final email assembly

    Returns the full pipeline result including decision,
    bias report, and complete email.
    """

    # ── Step 0: Hard Business Rules ────────────────────────
    rule_rejection = validate_application(application)
    if rule_rejection:
        return rule_rejection

    # ── Step 1: Preprocess ─────────────────────────────────
    features = preprocess_input(application)

    # ── Step 2: Model Prediction ───────────────────────────
    prediction = int(model.predict(features)[0])
    probability = float(model.predict_proba(features)[0][1])

    # ── Step 3: Bias Detection ─────────────────────────────
    applicant_dict = application.model_dump()
    applicant_dict['total_income'] = (
        application.applicant_income + application.coapplicant_income
    )

    bias_result = run_bias_agent(applicant_dict, prediction)

    # If bias agent flags for human review, stop pipeline here
    if bias_result['needs_human_review']:
        return {
            "status": "HUMAN_REVIEW",
            "decision": "PENDING",
            "probability": round(probability, 4),
            "bias_report": bias_result,
            "email": None,
            "marketing": None,
            "message": "Application flagged for human review due to bias concerns"
        }

    # ── Step 4: Email Generation ───────────────────────────
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

    # If email fails all guardrail retries, flag for human review
    if email_result['status'] == "HUMAN_REVIEW":
        return {
            "status": "HUMAN_REVIEW",
            "decision": "APPROVED" if prediction == 1 else "DENIED",
            "probability": round(probability, 4),
            "bias_report": bias_result,
            "email": None,
            "marketing": None,
            "message": "Email flagged for human review after failing guardrails"
        }

    # ── Step 5: Marketing Recommendations ─────────────────
    marketing_data = {
        "name": application.name,
        "total_income": applicant_dict['total_income'],
        "credit_history": application.credit_history,
        "self_employed": application.self_employed,
        "education": application.education,
        "loan_amount": application.loan_amount,
        "loan_term": application.loan_amount_term,
        "property_area": application.property_area
    }

    marketing_result = run_marketing_agent(marketing_data, prediction)

    # ── Step 6: Assemble Final Email ───────────────────────
    final_email = build_final_email(
        email_result['email'],
        marketing_result['recommendation_text']
    )

    # ── Step 6.5: Send Email to Applicant ─────────────────
    email_send_result = {"sent": False, "message_id": None, "error": "No email address on account"}

    if user["email"] and final_email:
        email_send_result = send_loan_email(
            applicant_email=user["email"],
            applicant_name=application.name,
            decision="APPROVED" if prediction == 1 else "DENIED",
            email_body=final_email
        )

    # ── Step 7: Save to Database ───────────────────────────
    try:
        save_application(
            user_id=user["id"],
            user_email=user["email"],
            form_data=application.model_dump(),
            user_token=user["token"],
            result={
                "status": "SUCCESS",
                "decision": "APPROVED" if prediction == 1 else "DENIED",
                "probability": round(probability, 4),
                "bias_report": {
                    "bias_score": bias_result['bias_score'],
                    "decision": bias_result['decision'],
                    "metrics": bias_result['metrics']
                },
                "email": {
                    "status": email_result['status'],
                    "attempts": email_result['attempts'],
                    "body": final_email
                },
                "marketing": {
                    "eligible_products": marketing_result['eligible_products'],
                    "product_count": marketing_result['product_count']
                }
            },
        )
    except Exception as e:
        print(f"Database save failed: {e}")
        # Don't fail the request if DB save fails   # Just log the error and continue   

    # ── Return Full Pipeline Result ────────────────────────
    return {
        "status": "SUCCESS",
        "decision": "APPROVED" if prediction == 1 else "DENIED",
        "probability": round(probability, 4),
        "bias_report": {
            "bias_score": bias_result['bias_score'],
            "decision": bias_result['decision'],
            "metrics": bias_result['metrics']
        },
        "email": {
            "status": email_result['status'],
            "attempts": email_result['attempts'],
            "body": final_email,
            "sent": email_send_result['sent'],
            "recipient": email_send_result['recipient'] if email_send_result['sent'] else None
        },
        "marketing": {
            "eligible_products": marketing_result['eligible_products'],
            "product_count": marketing_result['product_count']
        }
    }

@app.get("/applications/{user_id}")
def get_applications(user_id: str, user: dict = Depends(get_current_user)):
    """
    Returns all applications submitted by the authenticated user.
    Used by the frontend history/dashboard page.
    """
    if user_id != user["id"]:
        raise HTTPException(status_code=403, detail="Not allowed to view these applications")
    try:
        applications = get_user_applications(user["id"], user["token"])
        return {"applications": applications}
    except Exception:
        return {"applications": [], "error": "Failed to load applications"}