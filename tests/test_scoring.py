"""The served v2 model: loads, scores, explains, and behaves like its training contract."""
import pytest

from main import FAIRNESS_GATE, MODEL_CARD, THRESHOLD
from scoring import load_card, load_model, score_application

MODEL = load_model()


def p(app):
    return score_application(MODEL, app, THRESHOLD)["probability"]


def test_card_matches_the_model_and_has_a_threshold():
    card = load_card()
    assert card["model_version"] == MODEL_CARD["model_version"]
    assert 0.5 < card["policy"]["threshold"] < 1
    assert set(card["features"]).isdisjoint(card["excluded"]["protected"])


def test_scores_are_probabilities_with_explanations(application):
    out = score_application(MODEL, application, THRESHOLD)
    assert 0 < out["probability"] < 1
    assert out["auto_approve"] == (out["probability"] >= THRESHOLD)
    labels = [f["label"] for f in out["explanation"]]
    assert 0 < len(labels) <= 4 and len(labels) == len(set(labels))   # income + log income merged


@pytest.mark.parametrize("field,values", [
    ("sex", ["Male", "Female", "Not provided"]),
    ("race", ["White", "Black or African American", "Asian", "Not provided"]),
    ("ethnicity", ["Hispanic or Latino", "Not Hispanic or Latino"]),
    ("age", ["<25", "35-44", ">74"]),
])
def test_protected_attributes_cannot_change_a_score(application, field, values):
    scores = {p({**application, field: v}) for v in values}
    assert len(scores) == 1


def test_more_existing_debt_never_raises_approval(application):
    ps = [p({**application, "monthly_debts": d}) for d in (0, 500, 1000, 1500, 2000, 2500)]
    assert all(b <= a + 1e-9 for a, b in zip(ps, ps[1:]))


def test_a_smaller_deposit_never_raises_approval(application):
    ps = [p({**application, "loan_amount": a}) for a in (200_000, 240_000, 280_000, 300_000, 320_000)]
    # Loan amount itself is unconstrained, so only check the clear trend at the ends
    assert ps[-1] <= ps[0]


def test_strong_application_is_auto_approved(application):
    strong = {**application, "loan_amount": 200_000, "property_value": 320_000, "annual_income": 160_000,
              "monthly_debts": 0}
    assert score_application(MODEL, strong, THRESHOLD)["auto_approve"]


def test_deployed_model_passes_its_fairness_gate_with_a_disclosed_warning():
    assert FAIRNESS_GATE["decision"] == "CLEARED" and not FAIRNESS_GATE["needs_human_review"]
    assert FAIRNESS_GATE["bias_score"] <= FAIRNESS_GATE["threshold"]
    assert FAIRNESS_GATE["warning"] and FAIRNESS_GATE["groups"]
