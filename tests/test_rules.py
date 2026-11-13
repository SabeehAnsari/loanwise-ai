import pytest

from rules import check_business_rules


def test_valid_application_passes(application):
    assert check_business_rules(application) is None


def test_minimum_income(application):
    application.update(applicant_income=300, coapplicant_income=100)
    assert "minimum combined monthly income" in check_business_rules(application)


def test_income_exactly_at_minimum_passes(application):
    application.update(applicant_income=400, coapplicant_income=100, loan_amount=10)
    assert check_business_rules(application) is None


@pytest.mark.parametrize("amount", [0, -5])
def test_loan_amount_must_be_positive(application, amount):
    application["loan_amount"] = amount
    assert "greater than zero" in check_business_rules(application)


def test_loan_cap(application):
    application.update(loan_amount=10_001, applicant_income=10_000_000)
    assert "maximum loan amount" in check_business_rules(application)


def test_debt_to_income_cap(application):
    # 300k over 12 months = 25k/month against 6.5k income
    application.update(loan_amount=300, loan_amount_term=12)
    assert "debt-to-income" in check_business_rules(application)


def test_debt_to_income_boundary(application):
    # exactly 60% DTI is allowed: 3,600/month on 6,000 income
    application.update(applicant_income=6000, coapplicant_income=0, loan_amount=43.2, loan_amount_term=12)
    assert check_business_rules(application) is None
    application["loan_amount"] = 43.3
    assert check_business_rules(application) is not None
