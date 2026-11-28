"""Paths and the fixed experimental setup. Changing anything here changes the results."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data" / "hmda"
RAW_DIR = DATA_DIR / "raw"
MANIFEST = DATA_DIR / "manifest.json"
REPORT_DIR = ROOT / "reports" / "ml"

STATE = "GA"
TRAIN_YEAR = 2022   # fit and tune on this year...
TEST_YEAR = 2023    # ...evaluate once on the next year (temporal holdout)
SEED = 7

# Robustness experiments (ml.robustness):
DRIFT_YEAR = 2021                      # an earlier year, before mortgage rates jumped in 2022
OTHER_STATES = ["NC", "OH", "AZ", "WA"]  # unseen states, tested on TEST_YEAR

# Every extract the pipeline needs, as (year, state).
EXTRACTS = [(DRIFT_YEAR, STATE), (TRAIN_YEAR, STATE), (TEST_YEAR, STATE)] + [(TEST_YEAR, s) for s in OTHER_STATES]

# HMDA Data Browser filtered query: home-purchase applications that reached a decision
# (1 = originated, 2 = approved but not accepted, 3 = denied).
QUERY = {"actions_taken": "1,2,3", "loan_purposes": "1"}
API_CSV = "https://ffiec.cfpb.gov/v2/data-browser-api/view/csv"


def raw_path(year: int, state: str = STATE) -> Path:
    return RAW_DIR / f"hmda_{year}_{state}_purchase.csv"
