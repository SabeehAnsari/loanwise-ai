import copy

import pytest

from bias_agent import build_fairness_gate
from marketing_agent import build_final_email, get_eligible_products, run_marketing_agent
from scoring import load_card


def test_gate_reports_the_cards_audit():
    card = load_card()
    gate = build_fairness_gate(card)
    assert gate["scope"] == "model" and gate["model_version"] == card["model_version"]
    assert gate["bias_score"] == card["fairness"]["gate"]["value"]
    assert gate["operating_threshold"] == card["fairness"]["threshold"]


def test_failing_audit_triggers_human_review():
    card = copy.deepcopy(load_card())
    card["fairness"]["gate"]["passed"] = False
    gate = build_fairness_gate(card)
    assert gate["needs_human_review"] and gate["decision"] == "FLAG FOR HUMAN REVIEW"


def profile(**kw):
    base = {"dti": 30.0, "ltv": 80.0, "loan_type": "Conventional", "monthly_debts": 200, "annual_income": 100_000}
    return {**base, **kw}


def names(products):
    return {p["name"] for p in products}


def test_rate_lock_only_for_approved():
    assert "Rate lock (60 days)" in names(get_eligible_products(profile(), "APPROVED"))
    assert "Rate lock (60 days)" not in names(get_eligible_products(profile(), "REFERRED"))


def test_short_term_needs_low_debt_and_equity():
    assert "15-year fixed-rate mortgage" in names(get_eligible_products(profile(), "APPROVED"))
    assert "15-year fixed-rate mortgage" not in names(get_eligible_products(profile(dti=40), "APPROVED"))
    assert "15-year fixed-rate mortgage" not in names(get_eligible_products(profile(ltv=95), "APPROVED"))


def test_fha_suggested_for_small_deposits_unless_already_fha():
    assert "FHA-insured mortgage" in names(get_eligible_products(profile(ltv=96.5), "REFERRED"))
    assert "FHA-insured mortgage" not in names(get_eligible_products(profile(ltv=96.5, loan_type="FHA"), "REFERRED"))


def test_referred_applicants_get_education_and_heavy_debt_gets_a_review():
    eligible = names(get_eligible_products(profile(monthly_debts=2500), "REFERRED"))
    assert {"Home-buyer education course", "Debt consolidation review"} <= eligible


def test_marketing_agent_skips_llm_when_nothing_is_eligible(monkeypatch):
    monkeypatch.setattr("marketing_agent.get_eligible_products", lambda *a: [])
    monkeypatch.setattr("marketing_agent.generate_recommendations", lambda *a: pytest.fail("LLM must not be called"))
    assert run_marketing_agent(profile(), "APPROVED") == {"eligible_products": [], "recommendation_text": "",
                                                          "product_count": 0}


def test_build_final_email():
    assert build_final_email("Body", "") == "Body"
    assert "---" in build_final_email("Body", "Offers")
