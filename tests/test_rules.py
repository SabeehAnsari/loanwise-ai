import pytest

from rules import MAX_DTI, check_business_rules
from ml.serving import estimated_dti


def test_valid_application_passes(application):
    assert check_business_rules(application) is None


def test_minimum_income(application):
    application["annual_income"] = 9_999
    assert "minimum household income" in check_business_rules(application)


def test_income_exactly_at_minimum_is_not_rejected_for_income(application):
    application.update(annual_income=10_000, loan_amount=10_000, property_value=200_000, monthly_debts=0)
    assert check_business_rules(application) is None


@pytest.mark.parametrize("amount", [0, -5])
def test_loan_amount_must_be_positive(application, amount):
    application["loan_amount"] = amount
    assert "greater than zero" in check_business_rules(application)


def test_loan_cannot_exceed_property_value(application):
    application.update(loan_amount=330_000, property_value=320_000)
    assert "loan-to-value" in check_business_rules(application)


def test_loan_equal_to_property_value_is_allowed(application):
    application.update(loan_amount=320_000, property_value=320_000)
    assert check_business_rules(application) is None


def test_debt_to_income_cap(application):
    application["monthly_debts"] = 5_000
    assert estimated_dti(application) > MAX_DTI
    assert "debt-to-income" in check_business_rules(application)


def test_rule_order_reports_the_first_failure(application):
    application.update(annual_income=5_000, loan_amount=400_000)        # fails income and LTV
    assert "minimum household income" in check_business_rules(application)
