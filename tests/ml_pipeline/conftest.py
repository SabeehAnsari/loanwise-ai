import pandas as pd
import pytest


def row(**overrides):
    """One raw HMDA record (all strings, as read from the CSV) that passes every scope rule."""
    base = {
        "activity_year": "2022", "lei": "LEI1", "action_taken": "1", "lien_status": "1", "occupancy_type": "1",
        "business_or_commercial_purpose": "2", "reverse_mortgage": "2", "open-end_line_of_credit": "2",
        "derived_dwelling_category": "Single Family (1-4 Units):Site-Built", "debt_to_income_ratio": "30%-<36%",
        "applicant_credit_score_type": "1", "loan_amount": "205000", "income": "80", "loan_to_value_ratio": "95",
        "property_value": "215000", "loan_term": "360", "loan_type": "1", "conforming_loan_limit": "C",
        "co-applicant_sex": "5", "preapproval": "2", "derived_sex": "Female", "derived_race": "White",
        "derived_ethnicity": "Not Hispanic or Latino", "applicant_age": "35-44",
    }
    from ml.prepare import GEOGRAPHY, POST_DECISION
    base.update({c: "50" for c in GEOGRAPHY})
    base.update({c: "NA" for c in POST_DECISION})
    base.update(overrides)
    return base


@pytest.fixture
def make_raw():
    return lambda rows: pd.DataFrame([row(**r) for r in rows])
