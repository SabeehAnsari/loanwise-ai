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
    email = result.get("email") or {}
    marketing = result.get("marketing") or {}

    record = {
        "user_id": user_id,
        "user_email": user_email,
        "applicant_name": form_data.get("name"),
        # Generic columns shared with v1 rows (amounts are now in dollars, income is annual)
        "applicant_income": form_data.get("annual_income"),
        "loan_amount": form_data.get("loan_amount"),
        "loan_amount_term": form_data.get("loan_term"),
        "decision": result.get("decision"),
        "probability": result.get("probability"),
        "status": result.get("status"),
        "bias_score": bias.get("bias_score"),
        "bias_decision": bias.get("decision"),
        "email_status": email.get("status"),
        "email_attempts": email.get("attempts"),
        "email_body": email.get("body"),
        "eligible_products": marketing.get("eligible_products", []),
        "product_count": marketing.get("product_count", 0),
        # Added later; see docs/supabase_schema.sql for the migration
        "explanation": result.get("explanation") or [],
        "message": result.get("message"),
        "model_version": result.get("model_version"),
        "inputs": {**form_data, **(result.get("derived") or {})},
    }

    # Act as the signed-in user so row-level security applies
    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {user_token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    with httpx.Client() as client:
        response = _insert(client, headers, record)
        if response.status_code == 400 and _missing_new_columns(response):
            # Database not migrated yet: save without the newer columns
            # rather than losing the application.
            legacy = {k: v for k, v in record.items() if k not in NEW_COLUMNS}
            response = _insert(client, headers, legacy)
        response.raise_for_status()
        rows = response.json()
        return rows[0] if rows else {}


NEW_COLUMNS = ("explanation", "message", "model_version", "inputs")


def _insert(client: httpx.Client, headers: dict, record: dict) -> httpx.Response:
    return client.post(f"{SUPABASE_URL}/rest/v1/applications", headers=headers, json=record)


def _missing_new_columns(response: httpx.Response) -> bool:
    text = response.text
    return any(f"'{col}'" in text for col in NEW_COLUMNS)


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