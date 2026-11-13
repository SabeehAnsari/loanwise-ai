"""
Hard business rules evaluated before the ML model.
Clearly ineligible applications never reach the model.
"""

MIN_MONTHLY_INCOME = 500
MAX_LOAN_THOUSANDS = 10_000
MAX_DTI = 0.60


def check_business_rules(app: dict) -> str | None:
    """Return a rejection message if a rule fails, otherwise None."""
    total_income = app["applicant_income"] + app["coapplicant_income"]

    if total_income < MIN_MONTHLY_INCOME:
        return f"Application rejected: minimum combined monthly income requirement is ${MIN_MONTHLY_INCOME}"

    if app["loan_amount"] <= 0:
        return "Application rejected: loan amount must be greater than zero"

    if app["loan_amount"] > MAX_LOAN_THOUSANDS:
        return "Application rejected: maximum loan amount is $10,000,000 (10,000 thousands)"

    if app["loan_amount_term"] > 0:
        # Simplified: principal spread evenly over the term, interest ignored.
        estimated_monthly = (app["loan_amount"] * 1000) / app["loan_amount_term"]
        dti = estimated_monthly / total_income
        if dti > MAX_DTI:
            return (f"Application rejected: estimated debt-to-income ratio of {dti:.1%} "
                    f"exceeds maximum allowed {MAX_DTI:.0%}")

    return None
