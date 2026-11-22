import numpy as np
import pandas as pd
import pytest

from ml.evaluate import (automation_curve, bootstrap_ci, expected_calibration_error, gap_ci, group_rates,
                         scores, threshold_for_error)


def test_perfectly_calibrated_predictions_have_near_zero_ece():
    rng = np.random.default_rng(0)
    p = rng.uniform(size=200_000)
    y = (rng.uniform(size=p.size) < p).astype(int)
    assert expected_calibration_error(y, p) < 0.01


def test_overconfident_predictions_have_large_ece():
    y = np.array([1, 0] * 500)
    p = np.full(y.size, 0.95)
    assert expected_calibration_error(y, p) == pytest.approx(0.45)


def test_scores_reward_separation():
    y = np.array([0, 0, 1, 1])
    good = scores(y, [0.1, 0.2, 0.8, 0.9])
    bad = scores(y, [0.9, 0.8, 0.2, 0.1])
    assert good["roc_auc"] == 1.0 and bad["roc_auc"] == 0.0
    assert good["pr_auc_denial"] == 1.0
    assert good["log_loss"] < bad["log_loss"]


def test_bootstrap_ci_brackets_the_point_estimate():
    rng = np.random.default_rng(1)
    y = rng.integers(0, 2, 2000)
    p = np.clip(y * 0.6 + rng.uniform(size=y.size) * 0.4, 0, 1)
    point = scores(y, p)["roc_auc"]
    lo, hi = bootstrap_ci(y, p, lambda a, b: scores(a, b)["roc_auc"], n=200)
    assert lo <= point <= hi


def test_automation_curve_never_denies_and_trades_volume_for_errors():
    y = np.array([1, 1, 1, 0, 1, 0])
    p = np.array([0.95, 0.9, 0.85, 0.8, 0.6, 0.3])
    c = automation_curve(y, p, [0.5, 0.82])
    loose, strict = c.iloc[0], c.iloc[1]
    assert loose["auto_approved_share"] == pytest.approx(5 / 6)
    assert loose["wrong_auto_approval"] == pytest.approx(1 / 5)
    assert strict["wrong_auto_approval"] == 0.0
    assert strict["denials_caught_for_review"] == 1.0


def test_threshold_for_error_picks_lowest_safe_threshold():
    y = np.array([1, 1, 1, 0, 1, 0])
    p = np.array([0.95, 0.9, 0.85, 0.8, 0.6, 0.3])
    assert threshold_for_error(y, p, max_wrong=0.0) == pytest.approx(0.805)


def test_group_rates_and_gap():
    df = pd.DataFrame({
        "g": ["A"] * 300 + ["B"] * 300,
        "approved": [1] * 270 + [0] * 30 + [1] * 240 + [0] * 60,
        "p": [0.9] * 300 + [0.7] * 300,
    })
    rates = group_rates(df, "g", "p", threshold=0.8).set_index("group")
    assert rates.loc["A", "lender_approval"] == pytest.approx(0.9)
    assert rates.loc["B", "model_auto_approval"] == 0.0
    assert rates.loc["B", "false_referral"] == 1.0
    point, lo, hi = gap_ci(df, "g", "A", "B", lambda d: d["approved"], n=100)
    assert point == pytest.approx(-0.1)
    assert lo <= point <= hi


def test_small_groups_are_left_out():
    df = pd.DataFrame({"g": ["A"] * 300 + ["tiny"] * 5, "approved": 1, "p": 0.9})
    assert list(group_rates(df, "g", "p", 0.5)["group"]) == ["A"]
