// Shared API-shaped fixtures for tests (synthetic data).
export const USER = { id: "user-1", email: "reviewer@example.com", user_metadata: { full_name: "Alex Reviewer" } }

export const BIAS = {
  scope: "model",
  model_version: "xgb-test",
  decision: "CLEARED",
  bias_score: 0.032,
  threshold: 0.2,
  metrics: {
    male_approval_rate: 0.84, female_approval_rate: 0.8, married_approval_rate: 0.83, single_approval_rate: 0.82,
    gender_disparity: 0.039, married_disparity: 0.012, fnr_disparity: 0.035,
  },
  confidence_intervals: { gender_disparity: [0.002, 0.128], bias_score: [0.01, 0.099] },
  group_sizes: { male: 502, female: 112, married: 401, single: 213 },
}

export const EXPLANATION = [
  { feature: "Credit_History", label: "Credit history", impact: 1.42, direction: "positive" },
  { feature: "Income_to_Loan_Ratio", label: "Income-to-loan ratio", impact: -0.19, direction: "negative" },
]

export const APPROVED = {
  status: "SUCCESS", decision: "APPROVED", probability: 0.842, explanation: EXPLANATION, bias_report: BIAS,
  email: { status: "SENT", attempts: 1, body: "Dear Priya,\n\nApproved.\n---\nOffers text", sent: true, recipient: "reviewer@example.com" },
  marketing: { eligible_products: ["Fixed-rate Refinance"], product_count: 1 },
  application_id: "app-1",
}

export const RULES_REJECTED = {
  status: "REJECTED_BY_RULES", decision: "DENIED", probability: null,
  message: "Application rejected: estimated debt-to-income ratio of 113.6% exceeds maximum allowed 60%",
  explanation: [], bias_report: null, email: null, marketing: null, application_id: "app-2",
}

export const ROW = {
  id: "app-1", created_at: "2026-11-21T14:02:00Z", user_id: "user-1", applicant_name: "Priya Raman",
  gender: 0, married: 1, dependents: 3, education: 1, self_employed: 0,
  applicant_income: 5400, coapplicant_income: 1800, loan_amount: 128, loan_amount_term: 360,
  credit_history: 1, property_area: 2, status: "SUCCESS", decision: "APPROVED", probability: 0.842,
  bias_score: 0.032, bias_decision: "CLEARED", gender_disparity: 0.039, married_disparity: 0.012, fnr_disparity: 0.035,
  email_status: "SENT", email_attempts: 1, email_body: "Dear Priya", eligible_products: ["Fixed-rate Refinance"],
  product_count: 1, explanation: EXPLANATION, message: null,
}
