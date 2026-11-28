"""Turn a raw HMDA extract into a modelling table.

Every decision made here is recorded in ``SCOPE`` and in the returned
``ScopeLog`` so the case study can report exactly how many rows each rule removed.
"""
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from . import config

NA_TOKENS = {"NA", "Exempt", "", "nan"}

# Columns the HMDA record only fills in *after* the lender decides (or that encode
# the decision itself). Using any of them leaks the outcome into the features.
POST_DECISION = {
    "interest_rate": "Only reported for originated loans; blank for every denial.",
    "rate_spread": "Derived from the interest rate; blank for denials.",
    "total_loan_costs": "Closing costs exist only for originated loans.",
    "total_points_and_fees": "Closing costs exist only for originated loans.",
    "origination_charges": "Closing costs exist only for originated loans.",
    "discount_points": "Closing costs exist only for originated loans.",
    "lender_credits": "Closing costs exist only for originated loans.",
    "hoepa_status": "'Not applicable' for anything not originated.",
    "purchaser_type": "Loan sale after origination; always 0 for denials.",
    "denial_reason-1": "The lender's reason for denying: the outcome itself.",
    "denial_reason-2": "The lender's reason for denying: the outcome itself.",
    "denial_reason-3": "The lender's reason for denying: the outcome itself.",
    "denial_reason-4": "The lender's reason for denying: the outcome itself.",
    "prepayment_penalty_term": "Product term set when the loan is priced.",
    "intro_rate_period": "Product term set when the loan is priced.",
}

# Who the applicant is. Collected for the fairness audit, never model inputs.
PROTECTED = ["derived_sex", "derived_race", "derived_ethnicity", "applicant_age"]

# Census-tract context: legitimate market signal but also a proxy for race
# (e.g. tract minority share), so it is excluded from the main model and studied separately.
GEOGRAPHY = [
    "tract_minority_population_percent", "tract_to_msa_income_percentage",
    "ffiec_msa_md_median_family_income", "tract_population",
    "tract_owner_occupied_units", "tract_one_to_four_family_homes",
    "tract_median_age_of_housing_units",
]

# What the applicant knows when applying: the features the product model may use.
NUMERIC = ["loan_amount", "income", "dti", "ltv", "property_value", "loan_term"]
CATEGORICAL = ["loan_type", "conforming_loan_limit", "has_coapplicant"]

# Pre-decision in theory, but the extract's filter makes it leak: denied preapproval
# requests are reported under action 7, which a 1/2/3 query excludes, so every remaining
# "Requested" row was approved. Found by the separation audit in ml.run.leakage().
SELECTION_LEAK = {"preapproval": "Denied preapprovals are a different action code (7) the extract excludes, "
                                 "so every remaining 'Requested' application was approved."}
APPLICANT_FEATURES = NUMERIC + ["log_income", "loan_to_income"] + CATEGORICAL

LOAN_TYPES = {"1": "Conventional", "2": "FHA", "3": "VA", "4": "USDA"}

# Every value each categorical feature may take. Fixing the list keeps the model's encoding
# identical across years and states; anything else is treated as missing at prediction time
# (found when Washington 2023 contained conforming_loan_limit "Unknown", never seen in Georgia).
CATEGORY_LEVELS = {
    "loan_type": ["Conventional", "FHA", "VA", "USDA", "Other"],
    "conforming_loan_limit": ["C", "NC", "Unknown"],
    "has_coapplicant": ["No", "Yes"],
}

SCOPE = [
    ("full_reporter", "Lender reports DTI and credit data (not partially exempt)",
     lambda d: (d["debt_to_income_ratio"] != "Exempt") & (d["applicant_credit_score_type"] != "1111")),
    ("first_lien", "First-lien loans only", lambda d: d["lien_status"] == "1"),
    ("principal_residence", "Owner-occupied principal residence", lambda d: d["occupancy_type"] == "1"),
    ("consumer", "Not for a business or commercial purpose", lambda d: d["business_or_commercial_purpose"] == "2"),
    ("standard_product", "No reverse mortgages or open-end credit lines",
     lambda d: (d["reverse_mortgage"] == "2") & (d["open-end_line_of_credit"] == "2")),
    ("site_built_1_4", "Site-built home with 1-4 units",
     lambda d: d["derived_dwelling_category"] == "Single Family (1-4 Units):Site-Built"),
]


def parse_dti(value) -> float:
    """HMDA reports DTI as bands below 36% and above 49%, and as exact values 36-49.
    Bands map to their midpoint; '>60%' maps to 65; anything else is missing."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return np.nan
    v = str(value).strip()
    bands = {"<20%": 15.0, "20%-<30%": 25.0, "30%-<36%": 33.0, "50%-60%": 55.0, ">60%": 65.0}
    if v in bands:
        return bands[v]
    try:
        n = float(v)
    except ValueError:
        return np.nan
    return n if 36 <= n <= 49 else np.nan


def to_number(series: pd.Series) -> pd.Series:
    return pd.to_numeric(series.where(~series.isin(NA_TOKENS)), errors="coerce")


@dataclass
class ScopeLog:
    start: int
    steps: list = field(default_factory=list)

    def add(self, key, label, before, after):
        self.steps.append({"rule": key, "label": label, "removed": before - after, "remaining": after})


def load_raw(year: int, state: str = config.STATE) -> pd.DataFrame:
    return pd.read_csv(config.raw_path(year, state), dtype=str, keep_default_na=False, low_memory=False)


def apply_scope(raw: pd.DataFrame):
    log = ScopeLog(start=len(raw))
    df = raw
    for key, label, rule in SCOPE:
        before = len(df)
        df = df[rule(df)]
        log.add(key, label, before, len(df))
    return df.copy(), log


def build(raw: pd.DataFrame) -> tuple[pd.DataFrame, ScopeLog]:
    """Scope, label and featurise one raw extract."""
    df, log = apply_scope(raw)
    out = pd.DataFrame(index=df.index)
    out["year"] = df["activity_year"].astype(int)
    # Target: 1 = the lender approved (originated, or approved but not taken up).
    out["approved"] = df["action_taken"].isin(["1", "2"]).astype(int)

    out["loan_amount"] = to_number(df["loan_amount"])
    income_k = to_number(df["income"])
    out["income"] = income_k.where(income_k > 0) * 1000.0          # HMDA income is in $000s
    out["dti"] = df["debt_to_income_ratio"].map(parse_dti)
    out["ltv"] = to_number(df["loan_to_value_ratio"]).clip(upper=150)
    out["property_value"] = to_number(df["property_value"])
    out["loan_term"] = to_number(df["loan_term"])
    out["log_income"] = np.log1p(out["income"])
    out["loan_to_income"] = (out["loan_amount"] / out["income"]).clip(upper=20)

    out["loan_type"] = df["loan_type"].map(LOAN_TYPES).fillna("Other")
    out["conforming_loan_limit"] = df["conforming_loan_limit"].where(df["conforming_loan_limit"].isin(["C", "NC"]), "Unknown")
    out["has_coapplicant"] = (df["co-applicant_sex"] != "5").map({True: "Yes", False: "No"})
    out["preapproval"] = df["preapproval"].map({"1": "Requested", "2": "Not requested"}).fillna("Unknown")

    for col in PROTECTED:
        out[col] = df[col]
    out["applicant_age"] = out["applicant_age"].replace({"8888": "Not available", "9999": "Not available"})
    for col in GEOGRAPHY:
        out[col] = to_number(df[col])
    for col in POST_DECISION:
        out[f"leak__{col}"] = to_number(df[col])
    out["lei"] = df["lei"]
    return out, log
