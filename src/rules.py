"""
Hard business rules evaluated before the model.
Clearly ineligible applications never reach it. These are this demo's rules, not a
regulator's: a minimum income, a loan no larger than the property, and an estimated
debt-to-income ceiling (existing debts plus the new housing cost, see ml.serving).
"""
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from ml.serving import derived  # noqa: E402

MIN_ANNUAL_INCOME = 10_000
MAX_LTV = 100.0
MAX_DTI = 60.0


def check_business_rules(app: dict) -> str | None:
    """Return a rejection message if a rule fails, otherwise None."""
    if app["annual_income"] < MIN_ANNUAL_INCOME:
        return f"Application rejected: minimum household income is ${MIN_ANNUAL_INCOME:,} a year"
    if app["loan_amount"] <= 0:
        return "Application rejected: loan amount must be greater than zero"
    d = derived(app)
    if d["ltv"] > MAX_LTV:
        return (f"Application rejected: loan-to-value ratio of {d['ltv']:.1f}% "
                f"exceeds maximum allowed {MAX_LTV:.0f}% (the loan is larger than the property value)")
    if d["dti"] > MAX_DTI:
        return (f"Application rejected: estimated debt-to-income ratio of {d['dti']:.1f}% "
                f"exceeds maximum allowed {MAX_DTI:.0f}%")
    return None
