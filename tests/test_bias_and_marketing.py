import copy

import pytest

from bias_agent import build_fairness_gate, compute_bias_score, load_model_report
from marketing_agent import build_final_email, get_eligible_products, run_marketing_agent


def test_bias_score_weights():
    assert compute_bias_score(gender_disparity=1, married_disparity=0, fnr_disparity=0) == 0.4
    assert compute_bias_score(gender_disparity=0, married_disparity=1, fnr_disparity=0) == 0.2
    assert compute_bias_score(gender_disparity=0, married_disparity=0, fnr_disparity=1) == 0.4


def test_deployed_model_passes_its_audit():
    report = load_model_report()
    gate = build_fairness_gate(report)
    assert gate["scope"] == "model"
    assert gate["decision"] == "CLEARED" and not gate["needs_human_review"]
    # Gate recomputes the score from the stored metrics; must agree with the notebook
    assert gate["bias_score"] == pytest.approx(report["fairness_audit"]["bias_score"], abs=1e-3)


def test_failing_audit_triggers_human_review():
    report = copy.deepcopy(load_model_report())
    report["fairness_audit"]["metrics"]["gender_disparity"] = 0.6
    gate = build_fairness_gate(report)
    assert gate["needs_human_review"]
    assert gate["decision"] == "FLAG FOR HUMAN REVIEW"


def names(products):
    return {p["name"] for p in products}


def test_low_income_gets_no_products():
    assert get_eligible_products({"total_income": 1000, "credit_history": 1.0}) == []


def test_poor_credit_excludes_credit_gated_products():
    eligible = names(get_eligible_products({"total_income": 10_000, "credit_history": 0.0}))
    assert eligible == {"Personal Loan", "Education Loan", "Secured Loan"}


def test_self_employed_high_income_good_credit_small_loan_gets_everything():
    profile = {"total_income": 10_000, "credit_history": 1.0, "self_employed": 1, "loan_amount": 40}
    assert len(get_eligible_products(profile)) == 5


def test_business_loan_requires_self_employment():
    profile = {"total_income": 10_000, "credit_history": 1.0, "loan_amount": 40}
    assert "Business Loan" not in names(get_eligible_products({**profile, "self_employed": 0}))
    assert "Business Loan" in names(get_eligible_products({**profile, "self_employed": 1}))


def test_products_whose_cap_is_below_the_requested_amount_are_excluded():
    # Regression: salaried applicant, $5,000/month, $128k request was offered all five products
    profile = {"total_income": 5000, "credit_history": 1.0, "self_employed": 0, "loan_amount": 128}
    assert names(get_eligible_products(profile)) == {"Home Improvement Loan"}


def test_requested_amount_exactly_at_cap_is_allowed():
    profile = {"total_income": 3000, "credit_history": 0.0, "loan_amount": 50}
    assert "Personal Loan" in names(get_eligible_products(profile))


def test_marketing_agent_skips_llm_when_nothing_is_eligible(monkeypatch):
    monkeypatch.setattr("marketing_agent.generate_recommendations",
                        lambda *a: pytest.fail("LLM must not be called"))
    result = run_marketing_agent({"total_income": 100, "credit_history": 1.0}, 0)
    assert result == {"eligible_products": [], "recommendation_text": "", "product_count": 0}


def test_build_final_email():
    assert build_final_email("Body", "") == "Body"
    assert "---" in build_final_email("Body", "Offers")
