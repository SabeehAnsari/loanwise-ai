"""Serving parity: an application typed into the app must produce the same features the
training pipeline derives from the equivalent HMDA record."""
import math

import numpy as np
import pytest

from ml.prepare import APPLICANT_FEATURES, build, parse_dti
from ml.serving import (CONFORMING_LIMIT, application_to_frame, derived, estimated_dti, hmda_dti,
                        monthly_payment)

# How HMDA writes each encoded DTI value (bands; 36-49 are written as plain numbers).
HMDA_STRING = {15.0: "<20%", 25.0: "20%-<30%", 33.0: "30%-<36%", 55.0: "50%-60%", 65.0: ">60%"}

APP = {"loan_amount": 300_000, "property_value": 320_000, "annual_income": 96_000, "monthly_debts": 450,
       "loan_term": 360, "loan_type": "FHA", "has_coapplicant": True}


def test_monthly_payment_matches_the_annuity_formula():
    assert monthly_payment(300_000, 360, 0.06) == pytest.approx(1798.65, abs=0.01)
    assert monthly_payment(0, 360) == 0.0


def test_estimated_dti_adds_existing_debts_and_housing_cost():
    housing = monthly_payment(300_000, 360) + 320_000 * 0.015 / 12
    assert estimated_dti(APP) == pytest.approx(100 * (450 + housing) / 8000)
    assert math.isinf(estimated_dti({**APP, "annual_income": 0}))


@pytest.mark.parametrize("dti,expected", [(12, 15), (19.9, 25 - 10), (20, 25), (35.9, 33), (36, 36), (41.7, 41),
                                          (49.99, 49), (50, 55), (60, 55), (60.1, 65), (math.inf, 65)])
def test_hmda_dti_bands_match_how_training_data_was_parsed(dti, expected):
    assert hmda_dti(dti) == expected


def test_every_served_dti_value_is_one_the_parser_can_produce():
    parsed = {parse_dti(v) for v in ["<20%", "20%-<30%", "30%-<36%", "50%-60%", ">60%"]} | set(range(36, 50))
    for dti in np.linspace(0, 100, 501):
        assert hmda_dti(dti) in parsed


@pytest.mark.parametrize("debts", [0, 450, 1500, 3000])
def test_frame_matches_the_training_derivation_for_the_same_numbers(make_raw, debts):
    app = {**APP, "monthly_debts": debts}
    served = application_to_frame(app).iloc[0]
    d = derived(app)
    hmda_row = {
        "loan_amount": "300000", "property_value": "320000", "income": "96",          # HMDA income is in $000s
        "loan_to_value_ratio": f"{d['ltv']:.3f}", "loan_term": "360", "loan_type": "2",  # 2 = FHA
        "debt_to_income_ratio": HMDA_STRING.get(hmda_dti(d["dti"]), str(int(hmda_dti(d["dti"])))),
        "co-applicant_sex": "2", "conforming_loan_limit": "C",
    }
    trained, _ = build(make_raw([hmda_row]))
    trained = trained.iloc[0]
    for col in APPLICANT_FEATURES:
        if isinstance(served[col], str):
            assert served[col] == trained[col], col
        else:
            assert served[col] == pytest.approx(trained[col], rel=1e-3), col


def test_frame_has_model_columns_in_order_and_flags_jumbo_loans():
    frame = application_to_frame({**APP, "loan_amount": CONFORMING_LIMIT + 1, "property_value": 1_000_000})
    assert list(frame.columns) == APPLICANT_FEATURES
    assert frame["conforming_loan_limit"].iloc[0] == "NC"
    assert application_to_frame(APP)["conforming_loan_limit"].iloc[0] == "C"
