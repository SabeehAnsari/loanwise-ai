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
    assert "Gender" in body["excluded_features"]
    assert "fairness_audit" in body


def test_predict_requires_auth(application):
    main.limiter.enabled = False
    try:
        assert TestClient(main.app).post("/predict", json=application).status_code == 401
    finally:
        main.limiter.enabled = True


@pytest.mark.parametrize("field,value", [("gender", 7), ("credit_history", 2), ("applicant_income", -1),
                                         ("loan_amount_term", 0), ("name", "")])
def test_invalid_input_is_rejected(client, application, field, value):
    application[field] = value
    assert client.post("/predict", json=application).status_code == 422


def test_full_pipeline_success(client, application, saved):
    body = client.post("/predict", json=application).json()
    assert body["status"] == "SUCCESS"
    assert body["decision"] in {"APPROVED", "DENIED"}
    assert 0 <= body["probability"] <= 1
    assert body["explanation"] and body["explanation"][0]["label"]
    assert body["bias_report"]["scope"] == "model"
    assert body["email"]["sent"] and body["email"]["recipient"] == USER["email"]
    assert len(saved) == 1 and saved[0]["user_id"] == USER["id"]


def test_rule_rejection_is_returned_and_saved(client, application, saved):
    application.update(applicant_income=100, coapplicant_income=0)
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
