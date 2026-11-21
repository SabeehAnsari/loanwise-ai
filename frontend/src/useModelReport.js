import { useEffect, useState } from "react"
import { API_URL } from "./lib/api"

// The deployed model's card, as committed in src/model_report.json. Used when the
// API is unreachable so the public pages still show real, published figures.
export const PUBLISHED_REPORT = {
  model_version: "xgb-shallow-noprot-2026-11-13",
  model: "XGBoost (n_estimators=100, max_depth=2, learning_rate=0.05)",
  features: ["Dependents", "Education", "Self_Employed", "Loan_Amount_Term", "Credit_History",
    "Property_Area", "Income_to_Loan_Ratio", "Total_Income_Log", "LoanAmount_Log"],
  excluded_features: ["Gender", "Married"],
  training_rows: 614,
  evaluation: {
    protocol: "Repeated stratified 5-fold CV x 10, preprocessing fitted inside folds",
    metrics: {
      accuracy: { mean: 0.8146, std: 0.0277 },
      balanced_accuracy: { mean: 0.722, std: 0.0397 },
      f1: { mean: 0.878, std: 0.0172 },
      roc_auc: { mean: 0.768, std: 0.047 },
    },
    credit_history_rule_baseline: { accuracy: 0.8094, balanced_accuracy: 0.7054, f1: 0.8766, roc_auc: 0.7054 },
  },
  fairness_audit: {
    method: "Out-of-fold predictions (10 x 5-fold), averaged; 95% bootstrap CIs (1000 resamples)",
    threshold: 0.2,
    bias_score: 0.032,
    passed: true,
    metrics: {
      male_approval_rate: 0.8406, female_approval_rate: 0.8018,
      married_approval_rate: 0.8377, single_approval_rate: 0.8258,
      gender_disparity: 0.0389, married_disparity: 0.0118, fnr_disparity: 0.0351,
    },
    confidence_intervals: {
      gender_disparity: [0.0021, 0.1283], married_disparity: [0.0009, 0.0833],
      fnr_disparity: [0.0018, 0.1106], bias_score: [0.0099, 0.0994],
    },
    group_sizes: { male: 502, female: 112, married: 401, single: 213 },
  },
}

// Majority-class baseline from notebooks/07 (not part of /model).
export const MAJORITY_BASELINE = { accuracy: 0.687, balanced_accuracy: 0.5, f1: 0.815, roc_auc: 0.5 }

let cache = null

function load() {
  if (!cache) {
    cache = fetch(`${API_URL}/model`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((report) => ({ report, live: true }))
      .catch(() => { cache = null; return { report: PUBLISHED_REPORT, live: false } })
  }
  return cache
}

// GET /model, shared across pages. Falls back to the published report when offline.
export function useModelReport() {
  const [state, setState] = useState({ report: null, live: false })
  useEffect(() => {
    let alive = true
    load().then((s) => { if (alive) setState(s) })
    return () => { alive = false }
  }, [])
  return state
}
