"""Run every experiment and write reports/ml/{results.json, REPORT.md, *.png}.

    python -m ml.run            # full run (about 8 minutes)
"""
import json
import sys
import time

import numpy as np
import pandas as pd

from . import config
from .download import ensure
from .evaluate import (automation_curve, bootstrap_ci, gap_ci, group_rates, scores,
                       threshold_for_error)
from .models import Boosted, DtiRule, Logistic, Majority, out_of_fold, reweigh
from .prepare import APPLICANT_FEATURES, CATEGORICAL, GEOGRAPHY, POST_DECISION, SELECTION_LEAK, build, load_raw

DENIAL_REASONS = {
    "1": "Debt-to-income ratio", "2": "Employment history", "3": "Credit history", "4": "Collateral",
    "5": "Insufficient cash", "6": "Unverifiable information", "7": "Incomplete application",
    "8": "Mortgage insurance denied", "9": "Other",
}

FAIRNESS = {
    "derived_sex": ("Male", ["Female", "Joint"]),
    "derived_race": ("White", ["Black or African American", "Asian"]),
    "derived_ethnicity": ("Not Hispanic or Latino", ["Hispanic or Latino"]),
    "applicant_age": ("35-44", ["<25", "65-74", ">74"]),
}


def log(msg):
    print(f"[{time.strftime('%H:%M:%S')}] {msg}", file=sys.stderr, flush=True)


def load():
    frames, scope = {}, {}
    for year in (config.DRIFT_YEAR, config.TRAIN_YEAR, config.TEST_YEAR):
        df, slog = build(load_raw(year))
        frames[year], scope[year] = df, {"raw": slog.start, "steps": slog.steps, "rows": len(df),
                                         "approval_rate": float(df["approved"].mean()),
                                         "denials": int((df["approved"] == 0).sum())}
    return frames, scope


def leakage(train, test):
    leak_cols = [f"leak__{c}" for c in POST_DECISION]
    leaky = Boosted(monotone=False, name="XGBoost + post-decision columns").fit(train, APPLICANT_FEATURES + leak_cols)
    honest = Boosted(monotone=False).fit(train, APPLICANT_FEATURES)
    audit = []
    for c in leak_cols + APPLICANT_FEATURES:
        col = train[c]
        miss = col.isna().astype(int) if col.dtype != object else (col == "Unknown").astype(int)
        if miss.nunique() < 2:
            auc = 0.5
        else:
            from sklearn.metrics import roc_auc_score
            auc = roc_auc_score(1 - train["approved"], miss)
            auc = max(auc, 1 - auc)
        audit.append({"column": c.replace("leak__", ""), "post_decision": c.startswith("leak__"),
                      "missing_share_denied": float(miss[train["approved"] == 0].mean()),
                      "missing_share_approved": float(miss[train["approved"] == 1].mean()),
                      "missingness_auc": float(auc),
                      "reason": POST_DECISION.get(c.replace("leak__", ""), "")})
    # Separation audit: a category level with (almost) only one outcome is a red flag,
    # even when nothing is missing. This is how the preapproval selection leak shows up.
    separation = []
    for c in CATEGORICAL + list(SELECTION_LEAK):
        for level, d in train.groupby(c)["approved"]:
            if len(d) >= 100 and (d.mean() >= 0.999 or d.mean() <= 0.001):
                separation.append({"column": c, "level": level, "n": int(len(d)), "approval_rate": float(d.mean()),
                                   "in_features": c in APPLICANT_FEATURES, "reason": SELECTION_LEAK.get(c, "")})
    # Quantify the selection leak: the same monotonic model with and without `preapproval`.
    y = test["approved"].to_numpy()
    selection = {}
    for label, feats in (("without", APPLICANT_FEATURES), ("with", APPLICANT_FEATURES + list(SELECTION_LEAK))):
        p = Boosted(monotone=True).fit(train, feats).predict(test)
        t = threshold_for_error(y, p, 0.02)
        selection[label] = {"roc_auc": scores(y, p)["roc_auc"], "threshold_2pct": t,
                            "auto_approved_share_2pct": float((p >= t).mean())}
    return {
        "selection_leak": selection,
        "separation": separation,
        "leaky_auc": scores(test["approved"], leaky.predict(test))["roc_auc"],
        "honest_auc": scores(test["approved"], honest.predict(test))["roc_auc"],
        "audit": sorted(audit, key=lambda r: -r["missingness_auc"]),
    }


def compare(train, test):
    candidates = [Majority(), DtiRule(), Logistic(), Boosted(monotone=False), Boosted(monotone=True)]
    out, preds = [], {}
    for m in candidates:
        log(f"fit {m.name}")
        m.fit(train, APPLICANT_FEATURES)
        p = m.predict(test)
        s = scores(test["approved"], p)
        if m.name not in ("Majority class (approve everyone)",):
            s["roc_auc_ci"] = bootstrap_ci(test["approved"].to_numpy(), p,
                                           lambda a, b: scores(a, b)["roc_auc"], n=300, seed=config.SEED)
        s["name"] = m.name
        if isinstance(m, Boosted):
            s["trees"] = m.n_estimators
        out.append(s)
        preds[m.name] = (m, p)
    return out, preds


def calibration_bins(y, p, bins=10):
    edges = np.linspace(0, 1, bins + 1)
    idx = np.clip(np.digitize(p, edges[1:-1]), 0, bins - 1)
    rows = []
    for b in range(bins):
        m = idx == b
        if m.sum() >= 50:
            rows.append({"predicted": float(p[m].mean()), "observed": float(y[m].mean()), "n": int(m.sum())})
    return rows


def fairness(test, variants, threshold):
    out = {}
    for attr, (ref, others) in FAIRNESS.items():
        out[attr] = {"reference": ref, "groups": {}}
        for name, col in variants.items():
            rates = group_rates(test, attr, col, threshold)
            out[attr]["groups"][name] = rates.to_dict(orient="records")
        out[attr]["gaps"] = []
        for g in others:
            if (test[attr] == g).sum() < 200:
                continue
            row = {"group": g, "n": int((test[attr] == g).sum())}
            row["lender_gap"] = gap_ci(test, attr, ref, g, lambda d: d["approved"], seed=config.SEED)
            for name, col in variants.items():
                row[f"{name}__mean_p_gap"] = gap_ci(test, attr, ref, g, lambda d, c=col: d[c], seed=config.SEED)
                row[f"{name}__auto_gap"] = gap_ci(test, attr, ref, g, lambda d, c=col: d[c] >= threshold,
                                                  seed=config.SEED)
                row[f"{name}__false_referral_gap"] = gap_ci(
                    test[test["approved"] == 1], attr, ref, g, lambda d, c=col: d[c] < threshold,
                    seed=config.SEED)
            out[attr]["gaps"].append(row)
    return out


def explain(model, test, n=20000):
    sample = test.sample(min(n, len(test)), random_state=config.SEED)
    contrib = model.contributions(sample)
    importance = contrib.abs().mean().sort_values(ascending=False)
    reasons = test.loc[test["approved"] == 0, "leak__denial_reason-1"].dropna().astype(int).astype(str)
    reasons = reasons.map(DENIAL_REASONS).value_counts(normalize=True)
    return {"shap_importance": importance.round(4).to_dict(), "denial_reasons": reasons.round(4).to_dict()}


def main():
    t0 = time.time()
    manifest = ensure()
    log("load + scope")
    frames, scope = load()
    train, test = frames[config.TRAIN_YEAR], frames[config.TEST_YEAR]

    log("leakage experiment")
    leak = leakage(train, test)

    log("model comparison")
    comparison, preds = compare(train, test)
    chosen_model, p = preds["XGBoost (monotonic)"]
    test = test.assign(p_base=p)
    y = test["approved"].to_numpy()

    log("geography + reweighing variants")
    geo = Boosted(monotone=True, name="XGBoost (monotonic) + tract geography").fit(train, APPLICANT_FEATURES + GEOGRAPHY)
    rw = Boosted(monotone=True, name="XGBoost (monotonic) + race reweighing",
                 sample_weight=reweigh("derived_race")).fit(train, APPLICANT_FEATURES)
    test = test.assign(p_geo=geo.predict(test), p_rw=rw.predict(test))
    variant_scores = {
        "base": scores(y, test["p_base"]), "geography": scores(y, test["p_geo"]), "reweighed": scores(y, test["p_rw"]),
    }

    log("automation policy (thresholds chosen on out-of-fold %d predictions)" % config.TRAIN_YEAR)
    curve = automation_curve(y, test["p_base"], np.round(np.arange(0.5, 0.995, 0.01), 2))
    oof = out_of_fold(lambda: Boosted(monotone=True), train, APPLICANT_FEATURES, seed=config.SEED,
                      n_estimators=chosen_model.n_estimators)
    y_train = train["approved"].to_numpy()
    t2 = threshold_for_error(y_train, oof, 0.02)
    t5 = threshold_for_error(y_train, oof, 0.05)
    at = lambda t: automation_curve(y, test["p_base"], [t]).iloc[0].to_dict()  # noqa: E731
    in_train = lambda t: automation_curve(y_train, oof, [t]).iloc[0].to_dict()  # noqa: E731

    log("fairness (bootstrap)")
    # Fairness is measured at the realistic operating point (<= 5% wrong auto-approvals);
    # at the 2% point almost nothing is automated, so referral gaps would be meaningless.
    fair = fairness(test, {"base": "p_base", "geography": "p_geo", "reweighed": "p_rw"}, t5)

    log("explanations")
    expl = explain(chosen_model, test)

    from .robustness import drift, states
    log("robustness: drift over time")
    drift_res = drift(frames, chosen_model, t5, log=log)
    log("robustness: unseen states")
    state_res = states(chosen_model, t5, log=log)

    v1 = json.loads((config.ROOT / "src" / "model_report.json").read_text())
    results = {
        "setup": {"state": config.STATE, "train_year": config.TRAIN_YEAR, "test_year": config.TEST_YEAR,
                  "drift_year": config.DRIFT_YEAR, "other_states": config.OTHER_STATES,
                  "features": APPLICANT_FEATURES, "seed": config.SEED},
        "data": {"manifest": manifest["files"], "scope": scope},
        "leakage": leak,
        "comparison": comparison,
        "variants": variant_scores,
        "calibration": calibration_bins(y, test["p_base"].to_numpy()),
        "fairness_threshold": t5,
        "automation": {"curve": curve.to_dict(orient="records"),
                       "threshold_chosen_on": f"{config.TRAIN_YEAR} out-of-fold predictions",
                       "at_2pct": {**at(t2), "threshold": t2, "in_train": in_train(t2)},
                       "at_5pct": {**at(t5), "threshold": t5, "in_train": in_train(t5)}},
        "robustness": {"drift": drift_res, "states": state_res},
        "fairness": fair,
        "explanations": expl,
        "v1": {"rows": v1["training_rows"], "female": v1["fairness_audit"]["group_sizes"]["female"],
               "accuracy": v1["evaluation"]["metrics"]["accuracy"]["mean"],
               "roc_auc": v1["evaluation"]["metrics"]["roc_auc"]["mean"],
               "rule_roc_auc": v1["evaluation"]["credit_history_rule_baseline"]["roc_auc"]},
        "runtime_seconds": round(time.time() - t0, 1),
    }
    config.REPORT_DIR.mkdir(parents=True, exist_ok=True)
    (config.REPORT_DIR / "results.json").write_text(json.dumps(results, indent=2, default=float) + "\n")
    chosen_model.model.save_model(str(config.REPORT_DIR / "hmda_xgb_monotonic.json"))

    from .report import write_report
    write_report(results)
    log(f"done in {results['runtime_seconds']}s -> {config.REPORT_DIR}")


if __name__ == "__main__":
    main()
