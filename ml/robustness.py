"""Does the model hold up over time and in places it never saw?

drift():  train on one year, test on later years, as mortgage rates jumped during 2022.
states(): apply the Georgia model to other states' test year, against a locally trained model.
Thresholds are always chosen on the training year (out-of-fold) and then applied unchanged,
so these numbers show what a deployed policy would actually do.
"""
import numpy as np

from . import config
from .evaluate import gap_ci, scores, threshold_for_error
from .models import Boosted, out_of_fold
from .prepare import APPLICANT_FEATURES, build, load_raw

BUDGET = 0.05  # wrong auto-approvals allowed when choosing the operating threshold

GAPS = [("derived_race", "White", "Black or African American"),
        ("derived_ethnicity", "Not Hispanic or Latino", "Hispanic or Latino")]


def fit_with_threshold(train):
    """Monotonic model for a training frame, plus its 5%-budget threshold chosen out-of-fold."""
    model = Boosted(monotone=True).fit(train, APPLICANT_FEATURES)
    oof = out_of_fold(lambda: Boosted(monotone=True), train, APPLICANT_FEATURES, seed=config.SEED,
                      n_estimators=model.n_estimators)
    return model, threshold_for_error(train["approved"].to_numpy(), oof, BUDGET)


def policy(y, p, t):
    auto = p >= t
    return {"auto_approved_share": float(auto.mean()),
            "wrong_auto_approval": float(1 - y[auto].mean()) if auto.any() else 0.0}


def evaluate_on(df, p, t):
    y = df["approved"].to_numpy()
    s = scores(y, p)
    return {"rows": int(len(df)), "actual_approval": float(y.mean()), "mean_predicted": float(p.mean()),
            "roc_auc": s["roc_auc"], "ece": s["ece"], "brier": s["brier"], **policy(y, p, t)}


def fairness_at(df, p, t, min_n=300):
    d = df.assign(_p=p)
    out = []
    for attr, ref, other in GAPS:
        if (d[attr] == other).sum() < min_n or (d[attr] == ref).sum() < min_n:
            continue
        approved = d[d["approved"] == 1]
        out.append({
            "group": f"{other} vs {ref}", "n": int((d[attr] == other).sum()),
            "lender_gap": gap_ci(d, attr, ref, other, lambda x: x["approved"], seed=config.SEED),
            "model_mean_gap": gap_ci(d, attr, ref, other, lambda x: x["_p"], seed=config.SEED),
            "false_referral_gap": gap_ci(approved, attr, ref, other, lambda x: x["_p"] < t, seed=config.SEED),
        })
    return out


def drift(frames, main_model, main_threshold, log=print):
    """frames: {year: GA frame}. main_model was trained on TRAIN_YEAR."""
    log(f"drift: fit {config.DRIFT_YEAR}")
    early, t_early = fit_with_threshold(frames[config.DRIFT_YEAR])
    rows = []
    for name, model, t, train_year in (("trained on %d" % config.DRIFT_YEAR, early, t_early, config.DRIFT_YEAR),
                                       ("trained on %d" % config.TRAIN_YEAR, main_model, main_threshold, config.TRAIN_YEAR)):
        for year in sorted(frames):
            if year <= train_year:
                continue
            df = frames[year]
            rows.append({"model": name, "train_year": train_year, "test_year": year, "threshold": t,
                         **evaluate_on(df, model.predict(df), t)})
    profile = [{"year": y, "rows": int(len(d)), "approval_rate": float(d["approved"].mean()),
                "median_dti": float(d["dti"].median()), "median_ltv": float(d["ltv"].median()),
                "median_loan": float(d["loan_amount"].median()), "median_income": float(d["income"].median())}
               for y, d in sorted(frames.items())]
    return {"rows": rows, "profile": profile}


def states(main_model, main_threshold, log=print):
    out = []
    for st in config.OTHER_STATES:
        log(f"states: {st}")
        df, slog = build(load_raw(config.TEST_YEAR, st))
        p = main_model.predict(df)
        # Locally trained upper bound: 80/20 split of the state's own test year (same rows scored by both).
        rng = np.random.default_rng(config.SEED)
        hold = rng.uniform(size=len(df)) < 0.2
        local = Boosted(monotone=True).fit(df[~hold], APPLICANT_FEATURES)
        y_hold = df["approved"].to_numpy()[hold]
        out.append({
            "state": st, "scoped_rows": int(len(df)),
            "transfer": evaluate_on(df, p, main_threshold),
            "holdout_auc_transfer": scores(y_hold, p[hold])["roc_auc"],
            "holdout_auc_local": scores(y_hold, local.predict(df[hold]))["roc_auc"],
            "fairness": fairness_at(df, p, main_threshold),
        })
    return out
