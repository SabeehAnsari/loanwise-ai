"""Turn an application from the app into exactly the features the v2 model was trained on.

The training data (HMDA) reports what lenders recorded; an applicant fills in a form.
This module bridges the two with the same derivations as ``ml.prepare.build`` so that
serving cannot drift from training (see tests/ml_pipeline/test_serving.py).

Assumptions an applicant can't supply are explicit constants and are shown in the UI.
"""
import math

import numpy as np
import pandas as pd

from .prepare import APPLICANT_FEATURES

MODEL_VERSION = "hmda-v2-ga2022"

# HMDA's debt-to-income ratio counts all monthly debts *including* the new mortgage
# payment. Applicants rarely know it, so the app estimates the payment.
ASSUMED_RATE = 0.068            # 30-year fixed rate assumed for the payment estimate (2023 level)
TAX_AND_INSURANCE_RATE = 0.015  # yearly property tax + insurance, as a share of the property value
CONFORMING_LIMIT = 726_200      # FHFA 2023 baseline conforming loan limit (one unit)

LOAN_TYPES = ["Conventional", "FHA", "VA", "USDA"]

FEATURE_LABELS = {
    "dti": "Debt-to-income ratio",
    "ltv": "Loan-to-value ratio",
    "property_value": "Property value",
    "loan_amount": "Loan amount",
    "loan_type": "Loan type",
    "loan_to_income": "Loan relative to income",
    "has_coapplicant": "Co-applicant",
    "income": "Household income",
    "log_income": "Household income",
    "loan_term": "Loan term",
    "conforming_loan_limit": "Conforming loan limit",
}


def monthly_payment(loan_amount: float, term_months: float, rate: float = ASSUMED_RATE) -> float:
    """Principal and interest on a fixed-rate loan."""
    if loan_amount <= 0 or term_months <= 0:
        return 0.0
    r = rate / 12
    return loan_amount * r / (1 - (1 + r) ** -term_months)


def estimated_dti(app: dict) -> float:
    """Estimated debt-to-income ratio in percent: (existing debts + new housing cost) / monthly income."""
    monthly_income = app["annual_income"] / 12
    if monthly_income <= 0:
        return math.inf
    housing = monthly_payment(app["loan_amount"], app["loan_term"]) + app["property_value"] * TAX_AND_INSURANCE_RATE / 12
    return 100 * (app["monthly_debts"] + housing) / monthly_income


def hmda_dti(dti_percent: float) -> float:
    """Encode a DTI the way HMDA reports it, matching ``ml.prepare.parse_dti``: bands below 36%
    and above 49% become their midpoints, 36-49 are whole numbers."""
    if not np.isfinite(dti_percent):
        return 65.0
    if dti_percent < 20:
        return 15.0
    if dti_percent < 30:
        return 25.0
    if dti_percent < 36:
        return 33.0
    if dti_percent < 50:
        return float(math.floor(dti_percent))
    if dti_percent <= 60:
        return 55.0
    return 65.0


def derived(app: dict) -> dict:
    """Numbers the app shows the applicant and the rules use."""
    dti = estimated_dti(app)
    return {
        "dti": dti,
        "ltv": 100 * app["loan_amount"] / app["property_value"] if app["property_value"] > 0 else math.inf,
        "monthly_payment": monthly_payment(app["loan_amount"], app["loan_term"]),
        "conforming": app["loan_amount"] <= CONFORMING_LIMIT,
    }


def application_to_frame(app: dict) -> pd.DataFrame:
    """One-row frame of APPLICANT_FEATURES, derived exactly as ml.prepare.build does for HMDA rows."""
    d = derived(app)
    income = float(app["annual_income"]) if app["annual_income"] > 0 else np.nan
    row = {
        "loan_amount": float(app["loan_amount"]),
        "income": income,
        "dti": hmda_dti(d["dti"]),
        "ltv": min(d["ltv"], 150.0),
        "property_value": float(app["property_value"]),
        "loan_term": float(app["loan_term"]),
        "log_income": float(np.log1p(income)) if income == income else np.nan,
        "loan_to_income": min(app["loan_amount"] / income, 20.0) if income == income else np.nan,
        "loan_type": app["loan_type"],
        "conforming_loan_limit": "C" if d["conforming"] else "NC",
        "has_coapplicant": "Yes" if app["has_coapplicant"] else "No",
    }
    return pd.DataFrame([row])[APPLICANT_FEATURES]
