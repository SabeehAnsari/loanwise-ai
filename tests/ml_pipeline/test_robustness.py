import numpy as np
import pandas as pd
import pytest

from ml import config
from ml.download import url_for
from ml.models import Boosted, out_of_fold
from ml.prepare import APPLICANT_FEATURES
from ml.robustness import evaluate_on, fairness_at, policy


def test_extracts_cover_train_test_drift_and_other_states():
    assert (config.TRAIN_YEAR, config.STATE) in config.EXTRACTS
    assert (config.TEST_YEAR, config.STATE) in config.EXTRACTS
    assert (config.DRIFT_YEAR, config.STATE) in config.EXTRACTS
    assert all((config.TEST_YEAR, s) in config.EXTRACTS for s in config.OTHER_STATES)
    assert config.STATE not in config.OTHER_STATES
    assert config.raw_path(2023, "NC").name == "hmda_2023_NC_purchase.csv"


def test_download_url_names_the_state_and_keeps_the_filters():
    url = url_for(2023, "OH")
    assert "states=OH" in url and "years=2023" in url
    assert "actions_taken=1%2C2%2C3" in url and "loan_purposes=1" in url


def test_policy_counts_only_auto_approved_rows():
    y = np.array([1, 1, 0, 0])
    p = np.array([0.99, 0.95, 0.96, 0.10])
    assert policy(y, p, 0.94) == {"auto_approved_share": 0.75, "wrong_auto_approval": pytest.approx(1 / 3)}
    assert policy(y, p, 1.0)["wrong_auto_approval"] == 0.0


@pytest.fixture
def synthetic():
    rng = np.random.default_rng(3)
    n = 4000
    dti = rng.uniform(15, 65, n)
    race = rng.choice(["White", "Black or African American"], n)
    df = pd.DataFrame({
        "dti": dti, "income": 70000.0, "log_income": np.log1p(70000.0), "ltv": 90.0, "loan_amount": 200000.0,
        "property_value": 220000.0, "loan_term": 360.0, "loan_to_income": 2.9, "loan_type": "Conventional",
        "conforming_loan_limit": "C", "has_coapplicant": "No", "derived_race": race,
        "derived_ethnicity": "Not Hispanic or Latino",
    })
    df["approved"] = (rng.uniform(size=n) < 1 / (1 + np.exp(-(4 - 0.08 * dti)))).astype(int)
    return df


def test_out_of_fold_never_scores_a_row_with_a_model_that_saw_it(synthetic):
    p = out_of_fold(lambda: Boosted(monotone=True), synthetic, APPLICANT_FEATURES, folds=3, n_estimators=40)
    assert p.shape == (len(synthetic),) and np.isfinite(p).all()
    full = Boosted(monotone=True).fit(synthetic, APPLICANT_FEATURES, n_estimators=40).predict(synthetic)
    assert not np.allclose(p, full)   # in-sample predictions differ from cross-fitted ones


def test_evaluate_on_and_fairness_report_shape(synthetic):
    p = np.clip(1 - synthetic["dti"].to_numpy() / 100, 0, 1)
    e = evaluate_on(synthetic, p, 0.6)
    assert set(e) >= {"roc_auc", "ece", "actual_approval", "mean_predicted", "auto_approved_share", "wrong_auto_approval"}
    rows = fairness_at(synthetic, p, 0.6)
    assert [r["group"] for r in rows] == ["Black or African American vs White"]   # Hispanic group absent here
    point, lo, hi = rows[0]["false_referral_gap"]
    assert lo <= point <= hi
