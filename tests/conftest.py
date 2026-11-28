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
    """A typical, rule-compliant v2 mortgage application in API format."""
    return {
        "name": "Jane Doe",
        "loan_amount": 280_000,
        "property_value": 320_000,
        "annual_income": 110_000,
        "monthly_debts": 400,
        "loan_term": 360,
        "loan_type": "Conventional",
        "has_coapplicant": True,
        "sex": "Female",
        "race": "Not provided",
        "ethnicity": "Not provided",
        "age": "35-44",
    }
