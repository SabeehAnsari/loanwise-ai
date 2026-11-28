"""Candidate models. Each exposes fit(df) and predict(df) -> approval probability."""
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from xgboost import XGBClassifier

from .prepare import CATEGORICAL, CATEGORY_LEVELS

QM_DTI_LIMIT = 43.0  # historic Qualified Mortgage debt-to-income ceiling


class Majority:
    name = "Majority class (approve everyone)"

    def fit(self, df, features):
        self.rate = df["approved"].mean()
        return self

    def predict(self, df):
        return np.full(len(df), self.rate)


class DtiRule:
    """The one-line rule a loan officer might use: approve unless DTI exceeds 43%."""
    name = "One-line rule: approve if DTI <= 43%"

    def fit(self, df, features):
        ok = (df["dti"] <= QM_DTI_LIMIT) | df["dti"].isna()
        # Score = the approval rate observed in each branch of the rule on training data.
        self.p_ok, self.p_no = df.loc[ok, "approved"].mean(), df.loc[~ok, "approved"].mean()
        return self

    def predict(self, df):
        ok = (df["dti"] <= QM_DTI_LIMIT) | df["dti"].isna()
        return np.where(ok, self.p_ok, self.p_no)


class Logistic:
    name = "Logistic regression"

    def fit(self, df, features):
        self.features = features
        num = [f for f in features if f not in CATEGORICAL]
        cat = [f for f in features if f in CATEGORICAL]
        pre = ColumnTransformer([
            ("num", make_pipeline(SimpleImputer(strategy="median", add_indicator=True), StandardScaler()), num),
            ("cat", OneHotEncoder(handle_unknown="ignore"), cat),
        ])
        self.model = make_pipeline(pre, LogisticRegression(max_iter=2000, C=1.0))
        self.model.fit(df[features], df["approved"])
        return self

    def predict(self, df):
        return self.model.predict_proba(df[self.features])[:, 1]


# Direction the approval probability must move as each feature increases (lending common sense):
# more debt or leverage never helps, more income never hurts.
MONOTONE = {"dti": -1, "ltv": -1, "loan_to_income": -1, "log_income": 1, "income": 1}


def as_xgb_frame(df, features):
    x = df[features].copy()
    for c in features:
        if c in CATEGORY_LEVELS:
            x[c] = pd.Categorical(x[c], categories=CATEGORY_LEVELS[c])   # unknown values -> missing
        elif c in CATEGORICAL or not pd.api.types.is_numeric_dtype(x[c]):
            x[c] = x[c].astype("category")
    return x


class Boosted:
    def __init__(self, monotone: bool = True, params: dict | None = None, name: str | None = None, sample_weight=None):
        self.monotone = monotone
        self.params = params or {}
        self.name = name or ("XGBoost (monotonic)" if monotone else "XGBoost (unconstrained)")
        self.sample_weight = sample_weight

    def _model(self, features, n_estimators):
        kw = dict(n_estimators=n_estimators, learning_rate=0.05, max_depth=4, subsample=0.8, colsample_bytree=0.8,
                  min_child_weight=5, reg_lambda=1.0, tree_method="hist", enable_categorical=True,
                  eval_metric="logloss", random_state=7, n_jobs=-1)
        kw.update(self.params)
        if self.monotone:
            kw["monotone_constraints"] = {f: s for f, s in MONOTONE.items() if f in features}
        return XGBClassifier(**kw)

    def fit(self, df, features, n_estimators=None):
        self.features = features
        x = as_xgb_frame(df, features)
        w = self.sample_weight(df) if self.sample_weight else None
        if n_estimators is None:
            # Early stopping on a 20% slice of the training year picks the number of trees.
            rng = np.random.default_rng(7)
            val = rng.uniform(size=len(df)) < 0.2
            probe = self._model(features, 2000)
            probe.set_params(early_stopping_rounds=50)
            probe.fit(x[~val], df["approved"][~val], sample_weight=None if w is None else w[~val],
                      eval_set=[(x[val], df["approved"][val])], verbose=False)
            n_estimators = int(probe.best_iteration) + 1
        self.n_estimators = n_estimators
        self.model = self._model(features, n_estimators)
        self.model.fit(x, df["approved"], sample_weight=w)
        return self

    def predict(self, df):
        return self.model.predict_proba(as_xgb_frame(df, self.features))[:, 1]

    def contributions(self, df) -> pd.DataFrame:
        """TreeSHAP contributions (log-odds) per feature, last column is the bias."""
        import xgboost as xgb
        m = xgb.DMatrix(as_xgb_frame(df, self.features), enable_categorical=True)
        c = self.model.get_booster().predict(m, pred_contribs=True)
        return pd.DataFrame(c[:, :-1], columns=self.features, index=df.index)


def reweigh(group_col: str):
    """Kamiran & Calders reweighing: weight each (group, label) cell so that group and
    label look independent in the training data."""
    def weights(df):
        n = len(df)
        pg = df[group_col].value_counts() / n
        py = df["approved"].value_counts() / n
        pgy = df.groupby([group_col, "approved"]).size() / n
        expected = pg.loc[df[group_col]].to_numpy() * py.loc[df["approved"]].to_numpy()
        observed = pgy.loc[list(zip(df[group_col], df["approved"]))].to_numpy()
        return expected / observed
    return weights


def out_of_fold(make_model, df, features, folds: int = 3, seed: int = 7, **fit_kw) -> np.ndarray:
    """Cross-fitted predictions on the training data: each row is scored by a model that
    did not see it. Used to choose operating thresholds without touching the test year."""
    rng = np.random.default_rng(seed)
    fold = rng.integers(0, folds, len(df))
    p = np.empty(len(df))
    for k in range(folds):
        m = make_model().fit(df[fold != k], features, **fit_kw)
        p[fold == k] = m.predict(df[fold == k])
    return p
