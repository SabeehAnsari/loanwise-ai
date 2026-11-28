"""Export the trained v2 model and its model card for the app.

Written by ``python -m ml.run``:
  src/models/hmda_v2.json         XGBoost model the API loads
  src/models/hmda_v2_card.json    model card the API serves at GET /model
  frontend/src/lib/modelCard.json same card, bundled so public pages work offline
"""
import json

from . import config
from .prepare import APPLICANT_FEATURES, CATEGORY_LEVELS, GEOGRAPHY, PROTECTED, SELECTION_LEAK
from .serving import ASSUMED_RATE, CONFORMING_LIMIT, FEATURE_LABELS, MODEL_VERSION, TAX_AND_INSURANCE_RATE

SERVE_DIR = config.ROOT / "src" / "models"
MODEL_FILE = SERVE_DIR / "hmda_v2.json"
CARD_FILE = SERVE_DIR / "hmda_v2_card.json"
FRONTEND_CARD = config.ROOT / "frontend" / "src" / "lib" / "modelCard.json"

# Fairness gate: automation is switched off if the model's average approval probability differs
# between a monitored group and its reference by more than this many points. Referral gaps at the
# operating threshold are larger; they are published as a warning (see the case study).
GATE_LIMIT = 0.10

LABELS = {"derived_sex": "Sex", "derived_race": "Race", "derived_ethnicity": "Ethnicity", "applicant_age": "Age"}


def _r(x, d=4):
    return round(float(x), d)


def _gap(t):
    return [_r(v) for v in t]


def build_card(r: dict) -> dict:
    chosen = next(c for c in r["comparison"] if c["name"] == "XGBoost (monotonic)")
    at5 = r["automation"]["at_5pct"]
    groups = []
    for attr, f in r["fairness"].items():
        for g in f["gaps"]:
            groups.append({"attribute": LABELS[attr], "group": g["group"], "reference": f["reference"], "n": g["n"],
                           "lender_gap": _gap(g["lender_gap"]), "model_gap": _gap(g["base__mean_p_gap"]),
                           "referral_gap": _gap(g["base__false_referral_gap"])})
    worst = max(groups, key=lambda g: abs(g["model_gap"][0]))
    gate_value = abs(worst["model_gap"][0])
    scope = r["data"]["scope"]
    train_scope = scope.get(str(r["setup"]["train_year"])) or scope.get(r["setup"]["train_year"])
    test_scope = scope.get(str(r["setup"]["test_year"])) or scope.get(r["setup"]["test_year"])
    return {
        "model_version": MODEL_VERSION,
        "model": "XGBoost with monotonic constraints (more debt or leverage never raises approval)",
        "data": {
            "source": "HMDA public Loan/Application Register (FFIEC), home purchase, first lien, owner-occupied",
            "train": {"state": r["setup"]["state"], "year": r["setup"]["train_year"], "rows": train_scope["rows"],
                      "approval_rate": _r(train_scope["approval_rate"])},
            "test": {"state": r["setup"]["state"], "year": r["setup"]["test_year"], "rows": test_scope["rows"],
                     "approval_rate": _r(test_scope["approval_rate"])},
        },
        "features": APPLICANT_FEATURES,
        "feature_labels": FEATURE_LABELS,
        "category_levels": CATEGORY_LEVELS,
        "excluded": {"protected": PROTECTED, "geography": GEOGRAPHY, "selection_leak": list(SELECTION_LEAK)},
        "metrics": {"roc_auc": _r(chosen["roc_auc"]), "roc_auc_ci": _gap(chosen["roc_auc_ci"]),
                    "pr_auc_denial": _r(chosen["pr_auc_denial"]), "brier": _r(chosen["brier"]), "ece": _r(chosen["ece"])},
        "comparison": [{"name": c["name"], "roc_auc": _r(c["roc_auc"]), "pr_auc_denial": _r(c["pr_auc_denial"])}
                       for c in r["comparison"]],
        "policy": {"threshold": _r(at5["threshold"]), "error_budget": 0.05,
                   "chosen_on": r["automation"]["threshold_chosen_on"],
                   "test_auto_approved_share": _r(at5["auto_approved_share"]),
                   "test_wrong_auto_approval": _r(at5["wrong_auto_approval"]),
                   "test_denials_referred": _r(at5["denials_caught_for_review"])},
        "fairness": {
            "threshold": _r(r["fairness_threshold"]),
            "gate": {"metric": "Largest gap in average approval probability between a monitored group and its reference",
                     "limit": GATE_LIMIT, "value": _r(gate_value), "worst_group": f"{worst['group']} vs {worst['reference']}",
                     "passed": gate_value <= GATE_LIMIT},
            "warning": "At the auto-approve threshold, some groups the lender approved are referred to a person "
                       "much more often than their reference group. Referral means review by a loan officer, not denial.",
            "groups": groups,
            "variants": {k: {"roc_auc": _r(v["roc_auc"])} for k, v in r["variants"].items()},
        },
        "robustness": {
            "drift": [{"train_year": x["train_year"], "test_year": x["test_year"], "roc_auc": _r(x["roc_auc"]),
                       "wrong_auto_approval": _r(x["wrong_auto_approval"])} for x in r["robustness"]["drift"]["rows"]],
            "states": [{"state": x["state"], "rows": x["scoped_rows"], "roc_auc_transfer": _r(x["holdout_auc_transfer"]),
                        "roc_auc_local": _r(x["holdout_auc_local"]),
                        "wrong_auto_approval": _r(x["transfer"]["wrong_auto_approval"]),
                        "black_referral_gap": next((_gap(f["false_referral_gap"]) for f in x["fairness"]
                                                    if f["group"].startswith("Black")), None)}
                       for x in r["robustness"]["states"]],
        },
        "leakage": {"post_decision_auc": _r(r["leakage"]["leaky_auc"]),
                    "selection_leak": {k: {"roc_auc": _r(v["roc_auc"]), "auto_share_2pct": _r(v["auto_approved_share_2pct"])}
                                       for k, v in r["leakage"]["selection_leak"].items()}},
        "assumptions": {"interest_rate": ASSUMED_RATE, "tax_and_insurance_rate": TAX_AND_INSURANCE_RATE,
                        "conforming_limit": CONFORMING_LIMIT},
        "top_factors": r["explanations"]["shap_importance"],
        "denial_reasons": r["explanations"]["denial_reasons"],
    }


def export(r: dict, model) -> dict:
    SERVE_DIR.mkdir(parents=True, exist_ok=True)
    model.model.save_model(str(MODEL_FILE))
    card = build_card(r)
    text = json.dumps(card, indent=2) + "\n"
    CARD_FILE.write_text(text, encoding="utf-8")
    if FRONTEND_CARD.parent.exists():
        FRONTEND_CARD.write_text(text, encoding="utf-8")
    return card
