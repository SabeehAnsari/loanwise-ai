"""
End-to-end tests of the FastAPI pipeline with every external service stubbed
(Supabase Auth, OpenAI, Resend, Supabase REST).
"""
import pytest
from fastapi.testclient import TestClient

import main
from auth import get_current_user

USER = {"id": "user-123", "email": "jane@example.com", "token": "token"}
APPROVAL_EMAIL = "Dear Jane, your loan has been approved.\n\nThe LoanWise AI Team"


@pytest.fixture
def saved():
    return []


@pytest.fixture
def client(monkeypatch, saved):
    main.app.dependency_overrides[get_current_user] = lambda: USER
    main.limiter.enabled = False
    monkeypatch.setattr(main, "generate_validated_email",
                        lambda data, pred: {"status": "SENT", "email": APPROVAL_EMAIL, "attempts": 1})
    monkeypatch.setattr(main, "run_marketing_agent",
                        lambda data, pred: {"eligible_products": ["Personal Loan"],
                                            "recommendation_text": "Offers", "product_count": 1})
    monkeypatch.setattr(main, "send_loan_email",
                        lambda **kw: {"sent": True, "recipient": kw["applicant_email"], "error": None})
    monkeypatch.setattr(main, "save_application", lambda **kw: saved.append(kw))
    yield TestClient(main.app)
    main.app.dependency_overrides.clear()
    main.limiter.enabled = True


def test_health(client):
    assert client.get("/health").json() == {"status": "healthy"}


def test_model_card_is_public(client):
    body = client.get("/model").json()
    assert body["model_version"].startswith("hmda-v2")
    assert "derived_sex" in body["excluded"]["protected"]
    assert body["policy"]["threshold"] and body["fairness"]["gate"]


def test_predict_requires_auth(application):
    main.limiter.enabled = False
    try:
        assert TestClient(main.app).post("/predict", json=application).status_code == 401
    finally:
        main.limiter.enabled = True


@pytest.mark.parametrize("field,value", [("sex", "Unknown"), ("loan_type", "Jumbo"), ("annual_income", -1),
                                         ("loan_term", 0), ("loan_amount", 0), ("property_value", -5), ("name", "")])
def test_invalid_input_is_rejected(client, application, field, value):
    application[field] = value
    assert client.post("/predict", json=application).status_code == 422


def test_full_pipeline_success(client, application, saved):
    body = client.post("/predict", json=application).json()
    assert body["status"] == "SUCCESS"
    assert body["decision"] in {"APPROVED", "REFERRED"}
    assert 0 <= body["probability"] <= 1
    assert body["model_version"].startswith("hmda-v2") and body["threshold"] == main.THRESHOLD
    assert set(body["derived"]) == {"dti", "ltv", "monthly_payment", "conforming"}
    assert body["explanation"] and body["explanation"][0]["label"]
    assert body["bias_report"]["scope"] == "model"
    assert body["email"]["sent"] and body["email"]["recipient"] == USER["email"]
    assert len(saved) == 1 and saved[0]["user_id"] == USER["id"]


def test_low_score_is_referred_never_denied(client, application, monkeypatch, saved):
    monkeypatch.setattr(main, "THRESHOLD", 0.999999)
    decisions = []
    monkeypatch.setattr(main, "generate_validated_email",
                        lambda data, decision: decisions.append(decision) or
                        {"status": "SENT", "email": "Dear Jane, a loan officer will review it. The LoanWise AI Team",
                         "attempts": 1})
    body = client.post("/predict", json=application).json()
    assert body["decision"] == "REFERRED" and body["status"] == "SUCCESS"
    assert "below the auto-approve threshold" in body["message"]
    assert decisions == ["REFERRED"]


def test_protected_attributes_are_optional(client, application):
    for key in ("sex", "race", "ethnicity", "age"):
        application.pop(key)
    assert client.post("/predict", json=application).status_code == 200


def test_rule_rejection_is_returned_and_saved(client, application, saved):
    application.update(annual_income=5_000)
    body = client.post("/predict", json=application).json()
    assert body["status"] == "REJECTED_BY_RULES"
    assert body["probability"] is None
    assert len(saved) == 1


def test_failed_fairness_audit_disables_automated_decisions(client, application, monkeypatch, saved):
    monkeypatch.setattr(main, "FAIRNESS_GATE", {**main.FAIRNESS_GATE, "needs_human_review": True})
    monkeypatch.setattr(main, "generate_validated_email", lambda *a: pytest.fail("must not email"))
    body = client.post("/predict", json=application).json()
    assert body["status"] == "HUMAN_REVIEW" and body["decision"] == "PENDING"
    assert len(saved) == 1


def test_guardrail_failure_goes_to_human_review(client, application, monkeypatch, saved):
    monkeypatch.setattr(main, "generate_validated_email",
                        lambda data, pred: {"status": "HUMAN_REVIEW", "email": None, "attempts": 3})
    body = client.post("/predict", json=application).json()
    assert body["status"] == "HUMAN_REVIEW"
    assert body["email"]["body"] is None
    assert len(saved) == 1


def test_database_failure_does_not_fail_the_request(client, application, monkeypatch):
    def boom(**kw):
        raise RuntimeError("db down")
    monkeypatch.setattr(main, "save_application", boom)
    assert client.post("/predict", json=application).status_code == 200


def test_cannot_read_another_users_applications(client):
    assert client.get("/applications/someone-else").status_code == 403


def test_saved_application_id_is_returned(client, application, monkeypatch):
    monkeypatch.setattr(main, "save_application", lambda **kw: {"id": "app-42"})
    body = client.post("/predict", json=application).json()
    assert body["application_id"] == "app-42"


def test_application_id_is_none_when_save_fails(client, application, monkeypatch):
    def boom(**kw):
        raise RuntimeError("db down")
    monkeypatch.setattr(main, "save_application", boom)
    assert client.post("/predict", json=application).json()["application_id"] is None
