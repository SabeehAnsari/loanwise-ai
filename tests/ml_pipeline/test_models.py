import numpy as np
import pandas as pd
import pytest

from ml.models import Boosted, DtiRule, Logistic, Majority, reweigh
from ml.prepare import APPLICANT_FEATURES


@pytest.fixture
def frame():
    rng = np.random.default_rng(0)
    n = 3000
    dti = rng.uniform(15, 65, n)
    income = rng.lognormal(11, 0.4, n)
    ltv = rng.uniform(60, 100, n)
    logit = 4 - 0.09 * dti + 0.6 * np.log(income / 60000) - 0.03 * (ltv - 80)
    df = pd.DataFrame({
        "dti": dti, "income": income, "log_income": np.log1p(income), "ltv": ltv,
        "loan_amount": income * 3, "property_value": income * 3.3, "loan_term": 360.0,
        "loan_to_income": 3.0 + rng.normal(0, 0.3, n),
        "loan_type": rng.choice(["Conventional", "FHA"], n), "conforming_loan_limit": "C",
        "has_coapplicant": rng.choice(["Yes", "No"], n), "preapproval": "Not requested",
        "group": rng.choice(["a", "b"], n),
    })
    df["approved"] = (rng.uniform(size=n) < 1 / (1 + np.exp(-logit))).astype(int)
    return df


def test_baselines(frame):
    assert np.allclose(Majority().fit(frame, []).predict(frame), frame["approved"].mean())
    p = DtiRule().fit(frame, []).predict(frame)
    assert set(np.round(p, 6)) <= {round(x, 6) for x in (p.max(), p.min())}
    assert p[frame["dti"] <= 43].mean() > p[frame["dti"] > 43].mean()


def test_models_learn_the_signal(frame):
    from ml.evaluate import scores
    for m in (Logistic(), Boosted(monotone=True, params={"n_estimators": 100}), Boosted(monotone=False)):
        m.fit(frame, APPLICANT_FEATURES, **({"n_estimators": 100} if isinstance(m, Boosted) else {}))
        assert scores(frame["approved"], m.predict(frame))["roc_auc"] > 0.7


def test_monotonic_model_never_rewards_more_debt(frame):
    m = Boosted(monotone=True).fit(frame, APPLICANT_FEATURES, n_estimators=150)
    probe = pd.concat([frame.iloc[[0]]] * 11, ignore_index=True)
    probe["dti"] = np.linspace(15, 65, 11)
    p = m.predict(probe)
    assert np.all(np.diff(p) <= 1e-9)


def test_contributions_explain_the_margin(frame):
    m = Boosted().fit(frame, APPLICANT_FEATURES, n_estimators=50)
    c = m.contributions(frame.head(5))
    assert list(c.columns) == APPLICANT_FEATURES


def test_reweighing_balances_group_and_label(frame):
    frame = frame.copy()
    frame.loc[frame["group"] == "b", "approved"] = (np.arange((frame["group"] == "b").sum()) % 3 > 0).astype(int)
    w = reweigh("group")(frame)
    weighted = frame.assign(w=w).groupby("group").apply(lambda d: np.average(d["approved"], weights=d["w"]))
    assert weighted["a"] == pytest.approx(weighted["b"], abs=1e-9)


def test_unseen_category_is_treated_as_missing_not_a_crash(frame):
    m = Boosted().fit(frame, APPLICANT_FEATURES, n_estimators=30)
    probe = frame.head(3).copy()
    probe["conforming_loan_limit"] = ["Unknown", "U", "C"]   # never in training data
    p = m.predict(probe)
    assert np.isfinite(p).all()
