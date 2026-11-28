"""
v2 model scoring and per-applicant explanations.

The model and the form-to-feature conversion come from the ``ml`` package, the same code
that trained it, so serving cannot drift from training. Explanations use XGBoost's built-in
TreeSHAP (pred_contribs=True): each feature's additive contribution to the log-odds of approval.
"""
import json
import os
import sys

import xgboost as xgb
from xgboost import XGBClassifier

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

from ml.models import as_xgb_frame  # noqa: E402
from ml.prepare import APPLICANT_FEATURES  # noqa: E402
from ml.serving import FEATURE_LABELS, application_to_frame  # noqa: E402

MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "hmda_v2.json")
CARD_PATH = os.path.join(MODEL_DIR, "hmda_v2_card.json")


def load_model(path: str = MODEL_PATH) -> XGBClassifier:
    model = XGBClassifier()
    model.load_model(path)
    return model


def load_card(path: str = CARD_PATH) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def explain(model: XGBClassifier, X, top_n: int = 4) -> list:
    """Top contributing factors for a one-row feature frame, largest impact first.
    Features that share a label (income and log income) are combined."""
    dm = xgb.DMatrix(as_xgb_frame(X, APPLICANT_FEATURES), enable_categorical=True)
    contribs = model.get_booster().predict(dm, pred_contribs=True)[0][:-1]   # drop the bias term
    by_label = {}
    for name, value in zip(APPLICANT_FEATURES, contribs):
        label = FEATURE_LABELS.get(name, name)
        feature, total = by_label.get(label, (name, 0.0))
        by_label[label] = (feature, total + float(value))
    factors = [
        {"feature": feature, "label": label, "impact": round(total, 4),
         "direction": "positive" if total > 0 else "negative"}
        for label, (feature, total) in by_label.items() if abs(total) >= 1e-3
    ]
    factors.sort(key=lambda f: abs(f["impact"]), reverse=True)
    return factors[:top_n]


def score_application(model: XGBClassifier, application: dict, threshold: float) -> dict:
    """Score one application. Protected attributes are never part of the features."""
    X = application_to_frame(application)
    probability = float(model.predict_proba(as_xgb_frame(X, APPLICANT_FEATURES))[0][1])
    return {
        "probability": probability,
        "auto_approve": probability >= threshold,
        "explanation": explain(model, X),
    }
