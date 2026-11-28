# v1 model (archived)

The original LoanWise model, trained on the 614-row Kaggle *Loan Prediction* dataset
(notebooks 01–07). Kept for the record and for the v1 → v2 comparison in
`python -m ml.run`; the app now serves the v2 HMDA model in `src/models/`.

- `model_report.json` – v1 cross-validated metrics and fairness audit
- `loan_model.json` – v1 XGBoost model
- `features.py` – v1 feature engineering used by notebook 07
