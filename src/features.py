"""
Single source of truth for feature engineering.

Used by the training notebook (07_model_evaluation.ipynb), the API (main.py)
and the tests, so training and serving can never drift apart.

Pipeline:
    raw Kaggle rows ──clean_raw()──┐
                                   ├──> base numeric columns ──engineer()──> model features
    API application ──application_to_base()──┘
"""
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator, TransformerMixin

# Encodings shared by the dataset and the API/frontend.
PROPERTY_AREA = {"Rural": 0, "Semiurban": 1, "Urban": 2}

# Base columns after cleaning/encoding (dataset naming).
BASE_COLUMNS = [
    "Gender", "Married", "Dependents", "Education", "Self_Employed",
    "ApplicantIncome", "CoapplicantIncome", "LoanAmount",
    "Loan_Amount_Term", "Credit_History", "Property_Area",
]

# Protected attributes: collected for the fairness audit, NOT fed to the model.
PROTECTED_COLUMNS = ["Gender", "Married"]

ALL_FEATURES = [
    "Gender", "Married", "Dependents", "Education", "Self_Employed",
    "Loan_Amount_Term", "Credit_History", "Property_Area",
    "Income_to_Loan_Ratio", "Total_Income_Log", "LoanAmount_Log",
]

# Exact column order the deployed model was trained on.
MODEL_FEATURES = [c for c in ALL_FEATURES if c not in PROTECTED_COLUMNS]

# Human-readable names for explanations shown to applicants.
FEATURE_LABELS = {
    "Gender": "Gender",
    "Married": "Marital status",
    "Dependents": "Number of dependents",
    "Education": "Education",
    "Self_Employed": "Employment type",
    "Loan_Amount_Term": "Loan term",
    "Credit_History": "Credit history",
    "Property_Area": "Property area",
    "Income_to_Loan_Ratio": "Income relative to loan amount",
    "Total_Income_Log": "Total household income",
    "LoanAmount_Log": "Requested loan amount",
}

_MODE_FILL = ["Gender", "Married", "Dependents", "Self_Employed",
              "Loan_Amount_Term", "Credit_History"]


def fit_fill_values(raw: pd.DataFrame) -> dict:
    """Learn imputation values from (training) raw data only."""
    fills = {c: raw[c].mode()[0] for c in _MODE_FILL}
    fills["LoanAmount"] = raw["LoanAmount"].median()
    return fills


def clean_raw(raw: pd.DataFrame, fill_values: dict) -> pd.DataFrame:
    """Impute and encode raw Kaggle rows into BASE_COLUMNS."""
    df = raw.fillna(fill_values)
    return pd.DataFrame({
        "Gender": (df["Gender"] == "Male").astype(int),
        "Married": (df["Married"] == "Yes").astype(int),
        "Dependents": df["Dependents"].astype(str).str.replace("+", "", regex=False).astype(int),
        "Education": (df["Education"] == "Graduate").astype(int),
        "Self_Employed": (df["Self_Employed"] == "Yes").astype(int),
        "ApplicantIncome": df["ApplicantIncome"].astype(float),
        "CoapplicantIncome": df["CoapplicantIncome"].astype(float),
        "LoanAmount": df["LoanAmount"].astype(float),
        "Loan_Amount_Term": df["Loan_Amount_Term"].astype(float),
        "Credit_History": df["Credit_History"].astype(float),
        "Property_Area": df["Property_Area"].map(PROPERTY_AREA).astype(int),
    }, index=raw.index)


def application_to_base(app: dict) -> pd.DataFrame:
    """Convert one API application (snake_case, already numeric) to a base row."""
    return pd.DataFrame([{
        "Gender": app["gender"],
        "Married": app["married"],
        "Dependents": app["dependents"],
        "Education": app["education"],
        "Self_Employed": app["self_employed"],
        "ApplicantIncome": float(app["applicant_income"]),
        "CoapplicantIncome": float(app["coapplicant_income"]),
        "LoanAmount": float(app["loan_amount"]),
        "Loan_Amount_Term": float(app["loan_amount_term"]),
        "Credit_History": float(app["credit_history"]),
        "Property_Area": app["property_area"],
    }])


def engineer(base: pd.DataFrame, columns=MODEL_FEATURES) -> pd.DataFrame:
    """Derive model features from base columns and return them in `columns` order."""
    out = base.copy()
    total_income = out["ApplicantIncome"] + out["CoapplicantIncome"]
    loan = out["LoanAmount"]
    out["Income_to_Loan_Ratio"] = np.where(loan > 0, total_income / loan.where(loan > 0, 1), 0.0)
    out["Total_Income_Log"] = np.log1p(total_income)
    out["LoanAmount_Log"] = np.log1p(loan)
    return out[list(columns)]


class LoanPreprocessor(TransformerMixin, BaseEstimator):
    """
    sklearn transformer: raw Kaggle rows -> model features.
    Imputation values are learned in fit(), so inside cross-validation they
    come from the training folds only (no leakage into the validation fold).
    """

    def __init__(self, columns=tuple(MODEL_FEATURES)):
        self.columns = columns

    def fit(self, X, y=None):
        self.fill_values_ = fit_fill_values(X)
        return self

    def transform(self, X):
        return engineer(clean_raw(X, self.fill_values_), self.columns)
