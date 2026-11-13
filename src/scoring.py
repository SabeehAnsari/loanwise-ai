"""
Model scoring and per-applicant explanations.

Explanations use XGBoost's built-in TreeSHAP (pred_contribs=True): each
feature's additive contribution to the log-odds of approval for this specific
applicant. Contributions plus the bias term sum exactly to the model output.
"""
import os

import xgboost as xgb
from xgboost import XGBClassifier

from features import FEATURE_LABELS, MODEL_FEATURES, application_to_base, engineer

MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "loan_model.json")


def load_model(path: str = MODEL_PATH) -> XGBClassifier:
    model = XGBClassifier()
    model.load_model(path)
    return model


def explain(model: XGBClassifier, X, top_n: int = 4) -> list:
    """Top contributing features for a single-row feature frame, largest impact first."""
    dm = xgb.DMatrix(X, feature_names=list(X.columns))
    contribs = model.get_booster().predict(dm, pred_contribs=True)[0][:-1]  # drop bias term
    factors = [
        {
            "feature": name,
            "label": FEATURE_LABELS.get(name, name),
            "impact": round(float(value), 4),
            "direction": "positive" if value > 0 else "negative",
        }
        for name, value in zip(X.columns, contribs)
        if abs(value) >= 1e-3
    ]
    factors.sort(key=lambda f: abs(f["impact"]), reverse=True)
    return factors[:top_n]


def score_application(model: XGBClassifier, application: dict) -> dict:
    """Run the model on one API application. Gender and marital status are not used."""
    X = engineer(application_to_base(application), MODEL_FEATURES)
    probability = float(model.predict_proba(X)[0][1])
    return {
        "prediction": int(probability >= 0.5),
        "probability": probability,
        "explanation": explain(model, X),
    }
