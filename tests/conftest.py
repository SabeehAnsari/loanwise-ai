import os

# Dummy credentials so modules can be imported without a real .env.
# No test makes a network call: OpenAI, Resend, Supabase are all stubbed.
os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("SUPABASE_URL", "http://supabase.invalid")
os.environ.setdefault("SUPABASE_ANON_KEY", "test-anon-key")
os.environ.setdefault("RESEND_API_KEY", "test-resend-key")

import pytest


@pytest.fixture
def application():
    """A typical, rule-compliant application in API format."""
    return {
        "name": "Jane Doe",
        "gender": 0,
        "married": 1,
        "dependents": 1,
        "education": 1,
        "self_employed": 0,
        "applicant_income": 5000,
        "coapplicant_income": 1500,
        "loan_amount": 120,
        "loan_amount_term": 360,
        "credit_history": 1.0,
        "property_area": 2,
    }
