// Shared API-shaped fixtures for tests (synthetic people; the bias block mirrors the model card).
import card from "../lib/modelCard.json"
import { cardToBias } from "../lib/records"

export const CARD = card
export const USER = { id: "user-1", email: "reviewer@example.com", user_metadata: { full_name: "Alex Reviewer" } }

export const BIAS = cardToBias(card)

export const EXPLANATION = [
  { feature: "dti", label: "Debt-to-income ratio", impact: 0.61, direction: "positive" },
  { feature: "ltv", label: "Loan-to-value ratio", impact: -0.19, direction: "negative" },
]

const BASE = {
  model_version: "hmda-v2-ga2022", threshold: card.policy.threshold,
  derived: { dti: 25.1, ltv: 80, monthly_payment: 1825.4, conforming: true },
}

export const APPROVED = {
  ...BASE, status: "SUCCESS", decision: "APPROVED", probability: 0.973, message: null,
  explanation: EXPLANATION, bias_report: BIAS,
  email: { status: "SENT", attempts: 1, body: "Dear Priya,\n\nApproved.\n---\nOffers text", sent: true, recipient: "reviewer@example.com" },
  marketing: { eligible_products: ["Rate lock (60 days)"], product_count: 1 },
  application_id: "app-1",
}

export const REFERRED = {
  ...APPROVED, decision: "REFERRED", probability: 0.872, application_id: "app-5",
  message: "Approval probability 87.2% is below the auto-approve threshold of 92%; a loan officer will review the application",
}

export const RULES_REJECTED = {
  ...BASE, status: "REJECTED_BY_RULES", decision: "DENIED", probability: null,
  message: "Application rejected: loan-to-value ratio of 105.0% exceeds maximum allowed 100% (the loan is larger than the property value)",
  explanation: [], bias_report: null, email: null, marketing: null, application_id: "app-2",
}

export const ROW = {
  id: "app-1", created_at: "2026-11-21T14:02:00Z", user_id: "user-1", applicant_name: "Priya Raman",
  model_version: "hmda-v2-ga2022", applicant_income: 125000, loan_amount: 280000, loan_amount_term: 360,
  status: "SUCCESS", decision: "APPROVED", probability: 0.973, bias_score: 0.0618, bias_decision: "CLEARED",
  email_status: "SENT", email_attempts: 1, email_body: "Dear Priya", eligible_products: ["Rate lock (60 days)"],
  product_count: 1, explanation: EXPLANATION, message: null,
  inputs: {
    name: "Priya Raman", loan_amount: 280000, property_value: 350000, annual_income: 125000, monthly_debts: 350,
    loan_term: 360, loan_type: "Conventional", has_coapplicant: true, sex: "Female", race: "Asian",
    ethnicity: "Not Hispanic or Latino", age: "35-44", dti: 25.1, ltv: 80, monthly_payment: 1825.4, conforming: true,
  },
}

// A run saved by the v1 model: no model_version and v1 columns. Must be hidden.
export const V1_ROW = {
  id: "old-1", created_at: "2026-11-10T10:00:00Z", applicant_name: "Old Run", status: "SUCCESS", decision: "APPROVED",
  probability: 0.8, loan_amount: 128, loan_amount_term: 360, gender: 0, married: 1,
}
