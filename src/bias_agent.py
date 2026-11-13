"""
Fairness gate.

The audit is a property of the *deployed model*, not of an individual
applicant: it is computed offline in notebooks/07_model_evaluation.ipynb on
out-of-fold predictions (each applicant scored by a model that never saw them)
and written to src/model_report.json. The API loads it once at startup.

If the deployed model fails its audit, every application is routed to human
review instead of being decided automatically. Retraining a model that fails
the audit therefore cannot silently ship automated decisions.
"""
import json
import os

REPORT_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "model_report.json")


def load_model_report(path: str = REPORT_PATH) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def compute_bias_score(gender_disparity: float, married_disparity: float, fnr_disparity: float) -> float:
    """
    Weighted fairness score (0 = no measured disparity).
    Gender approval gap 40%, gender false-negative-rate gap 40%, marital approval gap 20%.
    """
    return round(0.40 * gender_disparity + 0.40 * fnr_disparity + 0.20 * married_disparity, 4)


def build_fairness_gate(report: dict) -> dict:
    """Turn the model report's audit section into the gate result returned by the API."""
    audit = report["fairness_audit"]
    m = audit["metrics"]
    threshold = audit["threshold"]
    score = compute_bias_score(m["gender_disparity"], m["married_disparity"], m["fnr_disparity"])
    needs_review = score > threshold

    return {
        "scope": "model",
        "model_version": report.get("model_version"),
        "bias_score": score,
        "threshold": threshold,
        "needs_human_review": needs_review,
        "decision": "FLAG FOR HUMAN REVIEW" if needs_review else "CLEARED",
        "reason": (
            f"Deployed model's bias score {score} exceeds threshold {threshold}; "
            "automated decisions are disabled"
            if needs_review else
            f"Deployed model passed its fairness audit (bias score {score} ≤ {threshold})"
        ),
        "method": audit.get("method"),
        "metrics": m,
        "confidence_intervals": audit.get("confidence_intervals", {}),
        "group_sizes": audit.get("group_sizes", {}),
    }
