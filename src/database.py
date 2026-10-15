import os
import httpx
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_ANON_KEY")

def save_application(user_id: str, user_email: str,
                     form_data: dict, result: dict,
                     user_token: str) -> dict:
    bias = result.get("bias_report") or {}
    metrics = bias.get("metrics") or {}
    email = result.get("email") or {}
    marketing = result.get("marketing") or {}

    record = {
        "user_id": user_id,
        "user_email": user_email,
        "applicant_name": form_data.get("name"),
        "gender": form_data.get("gender"),
        "married": form_data.get("married"),
        "dependents": form_data.get("dependents"),
        "education": form_data.get("education"),
        "self_employed": form_data.get("self_employed"),
        "applicant_income": form_data.get("applicant_income"),
        "coapplicant_income": form_data.get("coapplicant_income"),
        "loan_amount": form_data.get("loan_amount"),
        "loan_amount_term": form_data.get("loan_amount_term"),
        "credit_history": form_data.get("credit_history"),
        "property_area": form_data.get("property_area"),
        "decision": result.get("decision"),
        "probability": result.get("probability"),
        "status": result.get("status"),
        "bias_score": bias.get("bias_score"),
        "bias_decision": bias.get("decision"),
        "gender_disparity": metrics.get("gender_disparity"),
        "married_disparity": metrics.get("married_disparity"),
        "fnr_disparity": metrics.get("fnr_disparity"),
        "email_status": email.get("status"),
        "email_attempts": email.get("attempts"),
        "email_body": email.get("body"),
        "eligible_products": marketing.get("eligible_products", []),
        "product_count": marketing.get("product_count", 0)
    }

    # Act as the signed-in user so row-level security applies
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    with httpx.Client() as client:
        response = client.post(
            f"{SUPABASE_URL}/rest/v1/applications",
            headers=headers,
            json=record
        )
        response.raise_for_status()
        return response.json()[0] if response.json() else {}


def get_user_applications(user_id: str, user_token: str) -> list:
    """
    Retrieves all applications for a specific user via the Supabase REST API
    (as that user, so row-level security applies), most recent first.
    """
    with httpx.Client() as client:
        response = client.get(
            f"{SUPABASE_URL}/rest/v1/applications",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {user_token}",
                "Content-Type": "application/json",
            },
            params={
                "user_id": f"eq.{user_id}",
                "order": "created_at.desc"
            }
        )
        response.raise_for_status()
        return response.json() or []