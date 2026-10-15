import pandas as pd
import numpy as np
import joblib
import os

# This works correctly in a .py file
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

DATA_PATH = os.path.join(BASE_DIR, 'data', 'processed_loan_data.csv')
MODEL_PATH = os.path.join(BASE_DIR, 'src', 'loan_model.pkl')

BIAS_THRESHOLD = 0.20


def false_negative_rate(group_df):
    """
    Calculates the rate at which qualified applicants are wrongly denied.
    This is the most harmful bias error in lending.
    """
    actual_pos = group_df[group_df['Actual'] == 1]
    if len(actual_pos) == 0:
        return 0
    fn = actual_pos[actual_pos['Predicted'] == 0]
    return len(fn) / len(actual_pos)


def compute_bias_score(gender_disparity, married_disparity, fnr_disparity):
    """
    Combines three disparity metrics into a single bias score (0 to 1).

    Weights:
    - Gender disparity:   40% (protected attribute)
    - FNR disparity:      40% (most harmful error type)
    - Marital disparity:  20% (secondary attribute)

    Score = 0  → perfectly fair
    Score = 1  → maximum bias
    Score > 0.20 → flag for human review
    """
    return round(
        0.40 * gender_disparity +
        0.40 * fnr_disparity +
        0.20 * married_disparity,
        4
    )


def run_bias_agent(applicant_data: dict, prediction: int) -> dict:
    """
    Runs a bias check against population-level model decisions.

    Parameters:
        applicant_data : dict of applicant features (not used for population
                         stats but kept for future per-applicant checks)
        prediction     : 0 (denied) or 1 (approved)

    Returns:
        dict containing:
            - bias_score        : float, weighted fairness score
            - needs_human_review: bool
            - decision          : str, routing decision
            - reason            : str, plain-english explanation
            - metrics           : dict of individual disparity values
    """
    # Load data and model
    df = pd.read_csv(DATA_PATH)
    model = joblib.load(MODEL_PATH)

    # Generate predictions on full dataset for population-level analysis
    X = df.drop(columns=['Loan_Status'])
    y = df['Loan_Status']
    y_pred = model.predict(X)

    # Build results dataframe
    results = X.copy()
    results['Actual'] = y.values
    results['Predicted'] = y_pred

    # --- Gender Disparity ---
    male_rate = results[results['Gender'] == 1]['Predicted'].mean()
    female_rate = results[results['Gender'] == 0]['Predicted'].mean()
    gender_disparity = abs(male_rate - female_rate)

    # --- Marital Status Disparity ---
    married_rate = results[results['Married'] == 1]['Predicted'].mean()
    single_rate = results[results['Married'] == 0]['Predicted'].mean()
    married_disparity = abs(married_rate - single_rate)

    # --- False Negative Rate Disparity ---
    male_fnr = false_negative_rate(results[results['Gender'] == 1])
    female_fnr = false_negative_rate(results[results['Gender'] == 0])
    fnr_disparity = abs(male_fnr - female_fnr)

    # --- Final Bias Score ---
    bias_score = compute_bias_score(gender_disparity, married_disparity, fnr_disparity)
    needs_review = bias_score > BIAS_THRESHOLD

    return {
        "bias_score": bias_score,
        "needs_human_review": needs_review,
        "decision": "FLAG FOR HUMAN REVIEW" if needs_review else "CLEARED",
        "reason": (
            f"Bias score {bias_score} exceeds threshold {BIAS_THRESHOLD}"
            if needs_review else
            f"Bias score {bias_score} is within acceptable range"
        ),
        "metrics": {
            "gender_disparity": round(gender_disparity, 4),
            "married_disparity": round(married_disparity, 4),
            "fnr_disparity": round(fnr_disparity, 4),
            "male_approval_rate": round(male_rate, 4),
            "female_approval_rate": round(female_rate, 4),
            "married_approval_rate": round(married_rate, 4),
            "single_approval_rate": round(single_rate, 4)
        }
    }
