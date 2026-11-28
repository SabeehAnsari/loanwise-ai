"""
Fairness gate (v2).

The audit is a property of the *deployed model*, computed offline by ``python -m ml.run`` on
the held-out test year and written to the model card. The API loads it once at startup.

Gate: if the model's average approval probability for any monitored group differs from its
reference group by more than the card's limit, automated decisions are switched off and every
application goes to human review.

Disclosure: at the auto-approve threshold, referral gaps are larger than the average gaps.
They don't switch automation off (referral means review by a person, never denial) but they
are returned with every decision and shown in the app.
"""


def build_fairness_gate(card: dict) -> dict:
    f = card["fairness"]
    gate = f["gate"]
    needs_review = not gate["passed"]
    return {
        "scope": "model",
        "model_version": card["model_version"],
        "bias_score": gate["value"],
        "threshold": gate["limit"],
        "metric": gate["metric"],
        "worst_group": gate["worst_group"],
        "needs_human_review": needs_review,
        "decision": "FLAG FOR HUMAN REVIEW" if needs_review else "CLEARED",
        "reason": (
            f"Largest average approval gap {gate['value']:.3f} exceeds the limit {gate['limit']:.2f}; "
            "automated decisions are disabled"
            if needs_review else
            f"Largest average approval gap {gate['value']:.3f} is within the limit {gate['limit']:.2f}"
        ),
        "warning": f["warning"],
        "operating_threshold": f["threshold"],
        "groups": f["groups"],
    }
