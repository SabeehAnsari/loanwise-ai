import math

import pytest

from ml.prepare import SCOPE, apply_scope, build, parse_dti


@pytest.mark.parametrize("raw,expected", [
    ("<20%", 15), ("20%-<30%", 25), ("30%-<36%", 33), ("36", 36), ("49", 49),
    ("50%-60%", 55), (">60%", 65),
])
def test_dti_bands_and_exact_values(raw, expected):
    assert parse_dti(raw) == expected


@pytest.mark.parametrize("raw", ["NA", "Exempt", "", "35", "50", "abc", None])
def test_dti_unknown_or_out_of_reported_range_is_missing(raw):
    assert math.isnan(parse_dti(raw))


def test_scope_rules_each_remove_their_case(make_raw):
    raw = make_raw([
        {},                                                   # kept
        {"debt_to_income_ratio": "Exempt"},                   # partially exempt reporter
        {"lien_status": "2"},                                 # subordinate lien
        {"occupancy_type": "3"},                              # investment property
        {"business_or_commercial_purpose": "1"},              # business purpose
        {"reverse_mortgage": "1"},                            # reverse mortgage
        {"derived_dwelling_category": "Single Family (1-4 Units):Manufactured"},
    ])
    kept, log = apply_scope(raw)
    assert len(kept) == 1
    assert log.start == 7
    assert [s["removed"] for s in log.steps] == [1, 1, 1, 1, 1, 1]
    assert [s["rule"] for s in log.steps] == [key for key, *_ in SCOPE]


def test_target_counts_approved_not_accepted_as_approved(make_raw):
    out, _ = build(make_raw([{"action_taken": "1"}, {"action_taken": "2"}, {"action_taken": "3"}]))
    assert out["approved"].tolist() == [1, 1, 0]


def test_features_are_parsed_into_model_units(make_raw):
    out, _ = build(make_raw([{"income": "80", "loan_amount": "200000", "co-applicant_sex": "2", "loan_type": "2"}]))
    r = out.iloc[0]
    assert r["income"] == 80_000                       # HMDA income is in thousands
    assert r["loan_to_income"] == pytest.approx(2.5)
    assert r["dti"] == 33
    assert r["has_coapplicant"] == "Yes"
    assert r["loan_type"] == "FHA"


def test_non_positive_or_missing_income_becomes_missing(make_raw):
    out, _ = build(make_raw([{"income": "-5"}, {"income": "NA"}]))
    assert out["income"].isna().all()
    assert out["loan_to_income"].isna().all()


def test_post_decision_columns_are_kept_only_under_a_leak_prefix(make_raw):
    out, _ = build(make_raw([{"interest_rate": "6.5"}]))
    assert "interest_rate" not in out.columns
    assert out["leak__interest_rate"].iloc[0] == 6.5


def test_unknown_age_codes_are_labelled(make_raw):
    out, _ = build(make_raw([{"applicant_age": "8888"}]))
    assert out["applicant_age"].iloc[0] == "Not available"


def test_leaky_and_protected_columns_are_never_model_features():
    from ml.prepare import APPLICANT_FEATURES, GEOGRAPHY, POST_DECISION, PROTECTED, SELECTION_LEAK
    banned = set(POST_DECISION) | set(SELECTION_LEAK) | set(PROTECTED) | set(GEOGRAPHY)
    assert banned.isdisjoint(APPLICANT_FEATURES)
