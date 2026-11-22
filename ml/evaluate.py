"""Metrics, uncertainty and fairness measurement. Pure functions over arrays/frames."""
import numpy as np
import pandas as pd
from sklearn.metrics import average_precision_score, brier_score_loss, log_loss, roc_auc_score


def expected_calibration_error(y, p, bins: int = 10) -> float:
    """Average |observed rate - predicted probability| over equal-width bins, weighted by bin size."""
    y, p = np.asarray(y), np.asarray(p)
    edges = np.linspace(0, 1, bins + 1)
    idx = np.clip(np.digitize(p, edges[1:-1]), 0, bins - 1)
    ece = 0.0
    for b in range(bins):
        m = idx == b
        if m.any():
            ece += m.mean() * abs(y[m].mean() - p[m].mean())
    return float(ece)


def scores(y, p) -> dict:
    """y = 1 if the lender approved; p = predicted approval probability.
    PR-AUC is reported for the minority class (denials), which is the one that matters."""
    y, p = np.asarray(y), np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return {
        "roc_auc": float(roc_auc_score(y, p)),
        "pr_auc_denial": float(average_precision_score(1 - y, 1 - p)),
        "brier": float(brier_score_loss(y, p)),
        "log_loss": float(log_loss(y, p)),
        "ece": expected_calibration_error(y, p),
    }


def bootstrap_ci(y, p, metric, n: int = 500, seed: int = 0, alpha: float = 0.05):
    """Percentile CI for a metric(y, p) by resampling applications with replacement."""
    rng = np.random.default_rng(seed)
    y, p = np.asarray(y), np.asarray(p)
    stats = []
    for _ in range(n):
        i = rng.integers(0, len(y), len(y))
        if y[i].min() == y[i].max():
            continue
        stats.append(metric(y[i], p[i]))
    lo, hi = np.quantile(stats, [alpha / 2, 1 - alpha / 2])
    return float(lo), float(hi)


def automation_curve(y, p, thresholds) -> pd.DataFrame:
    """Policy: auto-approve when p >= t, otherwise send to a human (the model never denies).
    'wrong_auto_approval' = share of auto-approved applications the lender actually denied."""
    y, p = np.asarray(y), np.asarray(p)
    rows = []
    for t in thresholds:
        auto = p >= t
        rows.append({
            "threshold": float(t),
            "auto_approved_share": float(auto.mean()),
            "wrong_auto_approval": float(1 - y[auto].mean()) if auto.any() else 0.0,
            "denials_caught_for_review": float((~auto[y == 0]).mean()) if (y == 0).any() else 1.0,
        })
    return pd.DataFrame(rows)


def threshold_for_error(y, p, max_wrong: float) -> float:
    """Lowest auto-approve threshold whose wrong-approval rate stays within max_wrong."""
    grid = np.round(np.arange(0.50, 0.995, 0.005), 3)
    curve = automation_curve(y, p, grid)
    ok = curve[curve["wrong_auto_approval"] <= max_wrong]
    return float(ok["threshold"].min()) if len(ok) else float(grid[-1])


def group_rates(df: pd.DataFrame, group: str, p_col: str, threshold: float, min_n: int = 200) -> pd.DataFrame:
    """Per group: size, the lender's approval rate, the model's mean approval probability,
    its auto-approval rate at the threshold, and its false-referral rate (lender approved,
    model would not auto-approve)."""
    rows = []
    for g, d in df.groupby(group):
        if len(d) < min_n:
            continue
        auto = d[p_col] >= threshold
        approved = d["approved"] == 1
        rows.append({
            "group": g, "n": int(len(d)),
            "lender_approval": float(approved.mean()),
            "model_mean_p": float(d[p_col].mean()),
            "model_auto_approval": float(auto.mean()),
            "false_referral": float((~auto[approved]).mean()) if approved.any() else np.nan,
        })
    return pd.DataFrame(rows).sort_values("n", ascending=False).reset_index(drop=True)


def gap_ci(df, group, ref, other, values, n: int = 400, seed: int = 0):
    """Bootstrap CI for mean(values) in `other` minus mean(values) in `ref`.

    ``values(df)`` returns one number per application (e.g. approved 0/1, a probability),
    and the two groups are resampled independently. Vectorised with NumPy so thousands of
    resamples over ~50k-row groups stay fast."""
    rng = np.random.default_rng(seed)
    a = np.asarray(values(df[df[group] == ref]), dtype=float)
    b = np.asarray(values(df[df[group] == other]), dtype=float)
    point = b.mean() - a.mean()
    diffs = np.empty(n)
    for i in range(n):
        diffs[i] = b[rng.integers(0, b.size, b.size)].mean() - a[rng.integers(0, a.size, a.size)].mean()
    lo, hi = np.quantile(diffs, [0.025, 0.975])
    return float(point), float(lo), float(hi)
