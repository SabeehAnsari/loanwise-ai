import json
import os

import numpy as np
import pandas as pd
import pytest
import xgboost as xgb

from features import (MODEL_FEATURES, PROTECTED_COLUMNS, application_to_base, clean_raw,
                      engineer, fit_fill_values)
from scoring import load_model, score_application

SRC = os.path.join(os.path.dirname(__file__), "..", "src")


@pytest.fixture(scope="module")
def model():
    return load_model()


def test_protected_attributes_are_not_model_inputs():
    assert not set(PROTECTED_COLUMNS) & set(MODEL_FEATURES)


def test_model_was_trained_on_exact_feature_order(model):
    assert model.get_booster().feature_names == MODEL_FEATURES


def test_serving_path_matches_training_path(application):
    """The API path and the training path must produce identical features."""
    raw = pd.DataFrame([{
        "Gender": "Female", "Married": "Yes", "Dependents": "1", "Education": "Graduate",
        "Self_Employed": "No", "ApplicantIncome": 5000, "CoapplicantIncome": 1500.0,
        "LoanAmount": 120.0, "Loan_Amount_Term": 360.0, "Credit_History": 1.0,
        "Property_Area": "Urban",
    }])
    from_training = engineer(clean_raw(raw, fit_fill_values(raw)))
    from_api = engineer(application_to_base(application))
    pd.testing.assert_frame_equal(from_training.reset_index(drop=True), from_api, check_dtype=False)


def test_dependents_3_plus_is_encoded_as_3():
    raw = pd.read_csv(os.path.join(SRC, "..", "data", "train_u6lujuX_CVtuZ9i.csv"))
    base = clean_raw(raw, fit_fill_values(raw))
    assert set(base["Dependents"].unique()) <= {0, 1, 2, 3}
    assert base.isna().sum().sum() == 0


def test_zero_loan_amount_does_not_divide_by_zero(application):
    application["loan_amount"] = 0
    X = engineer(application_to_base(application))
    assert X["Income_to_Loan_Ratio"].iloc[0] == 0
    assert np.isfinite(X.to_numpy(dtype=float)).all()


def test_probability_is_valid(model, application):
    scored = score_application(model, application)
    assert 0.0 <= scored["probability"] <= 1.0
    assert scored["prediction"] == int(scored["probability"] >= 0.5)


@pytest.mark.parametrize("field", ["gender", "married"])
def test_protected_attributes_cannot_change_the_score(model, application, field):
    """Counterfactual check: flipping gender or marital status leaves the score unchanged."""
    original = score_application(model, application)["probability"]
    application[field] = 1 - application[field]
    assert score_application(model, application)["probability"] == original


def test_good_credit_scores_higher_than_poor_credit(model, application):
    good = score_application(model, application)["probability"]
    application["credit_history"] = 0.0
    poor = score_application(model, application)
    assert poor["probability"] < good
    top = poor["explanation"][0]
    assert top["feature"] == "Credit_History" and top["direction"] == "negative"


def test_shap_contributions_sum_to_model_output(model, application):
    X = engineer(application_to_base(application))
    dm = xgb.DMatrix(X, feature_names=MODEL_FEATURES)
    contribs = model.get_booster().predict(dm, pred_contribs=True)
    margin = model.get_booster().predict(dm, output_margin=True)
    assert np.allclose(contribs.sum(axis=1), margin, atol=1e-4)


def test_explanation_shape(model, application):
    explanation = score_application(model, application)["explanation"]
    assert 1 <= len(explanation) <= 4
    impacts = [abs(f["impact"]) for f in explanation]
    assert impacts == sorted(impacts, reverse=True)
    assert all(f["feature"] in MODEL_FEATURES for f in explanation)


def test_model_report_matches_model():
    with open(os.path.join(SRC, "model_report.json")) as f:
        report = json.load(f)
    assert report["features"] == MODEL_FEATURES
    assert set(report["excluded_features"]) == set(PROTECTED_COLUMNS)
