import pytest

from email_agent import generate_validated_email, validate_email

SIGN = "\n\nBest regards,\nThe LoanWise AI Team"

APPROVAL = ("Dear Jane,\n\nCongratulations! We are pleased to inform you that your loan application "
            "has been approved. Our team will contact you about next steps." + SIGN)

DENIALS = [
    "Dear Jane,\n\nAfter careful review, we regret that your application has not been approved at this time.",
    "Dear Jane,\n\nUnfortunately your application hasn't been approved.",
    "Dear Jane,\n\nWe are unable to approve your loan application at this time.",
    "Dear Jane,\n\nWe regret to inform you that your loan application was denied.",
    "Dear Jane,\n\nYour application has been declined.",
]


def violations(text, prediction):
    return validate_email(text, prediction)["violations"]


def test_clean_approval_passes():
    assert validate_email(APPROVAL, 1)["passed"]


@pytest.mark.parametrize("body", DENIALS)
def test_typical_denials_pass(body):
    # Regression: "not been approved" used to be flagged as the wrong decision
    assert violations(body + SIGN, 0) == []


@pytest.mark.parametrize("body", DENIALS)
def test_denial_wording_fails_for_an_approval(body):
    assert any("approval" in v for v in violations(body + SIGN, 1))


def test_approval_wording_fails_for_a_denial():
    assert any("denial" in v for v in violations(APPROVAL, 0))


def test_email_without_any_decision_fails():
    text = "Dear Jane,\n\nThank you for your application." + SIGN
    assert not validate_email(text, 1)["passed"]
    assert not validate_email(text, 0)["passed"]


@pytest.mark.parametrize("phrase", [
    "Your loan carries a 5.5% interest rate.",
    "You will pay an interest rate of 7% annually.",
    "The APR of 12 applies.",
])
def test_invented_interest_rate_fails(phrase):
    assert any("interest rate" in v for v in violations(APPROVAL + "\n" + phrase, 1))


@pytest.mark.parametrize("phrase", [
    "Your monthly payment of $1,200 starts in May.",
    "You will pay $900 per month.",
    "Each installment of $450 is due monthly.",
])
def test_invented_payment_amount_fails(phrase):
    assert any("payment amount" in v for v in violations(APPROVAL + "\n" + phrase, 1))


def test_missing_signature_fails():
    text = APPROVAL.replace("The LoanWise AI Team", "The Bank")
    assert "GUARDRAIL FAILED: Missing required signature" in violations(text, 1)


def test_too_long_fails():
    text = APPROVAL + " word" * 300
    assert any("too long" in v for v in violations(text, 1))


def test_retries_until_a_valid_email():
    outputs = iter(["no decision here" + SIGN, "Your loan carries a 5% interest rate." + SIGN, APPROVAL])
    result = generate_validated_email({}, 1, generate=lambda data, pred: next(outputs))
    assert result["status"] == "SENT"
    assert result["attempts"] == 3
    assert result["email"] == APPROVAL


def test_escalates_to_human_review_after_max_retries():
    calls = []

    def bad(data, pred):
        calls.append(1)
        return "Dear Jane, thanks." + SIGN

    result = generate_validated_email({}, 0, max_retries=3, generate=bad)
    assert result["status"] == "HUMAN_REVIEW"
    assert result["email"] is None
    assert len(calls) == 3


def test_does_not_mutate_applicant_data():
    data = {"name": "Jane"}
    generate_validated_email(data, 1, generate=lambda d, p: APPROVAL)
    assert data == {"name": "Jane"}
