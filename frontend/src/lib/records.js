// Turn a stored `applications` row (see docs/supabase_schema.sql) into the same shape as a
// /predict response, so history and detail pages reuse the result views. Only v2 rows
// (those with a model_version) are shown; v1 rows stay in the database.

export const isV2 = (row) => typeof row.model_version === "string" && row.model_version.startsWith("hmda-v2")

// The model card's fairness block in the shape BiasReport expects (same as the API's bias_report).
export function cardToBias(card, decision) {
  const f = card?.fairness
  if (!f) return null
  return {
    scope: "model",
    model_version: card.model_version,
    decision: decision ?? (f.gate.passed ? "CLEARED" : "FLAG FOR HUMAN REVIEW"),
    bias_score: f.gate.value,
    threshold: f.gate.limit,
    worst_group: f.gate.worst_group,
    warning: f.warning,
    operating_threshold: f.threshold,
    groups: f.groups,
  }
}

const num = (v) => (v == null ? null : Number(v))

export function recordToResult(row, card) {
  const inputs = row.inputs || {}
  const hasBias = row.bias_score != null || row.bias_decision
  return {
    application_id: row.id,
    model_version: row.model_version,
    status: row.status,
    decision: row.decision,
    probability: num(row.probability),
    threshold: card?.policy?.threshold ?? null,
    message: row.message ?? null,
    explanation: Array.isArray(row.explanation) ? row.explanation : null,
    derived: inputs.dti != null ? { dti: inputs.dti, ltv: inputs.ltv, monthly_payment: inputs.monthly_payment,
      conforming: inputs.conforming } : null,
    bias_report: hasBias ? { ...cardToBias(card, row.bias_decision), bias_score: num(row.bias_score), stored: true } : null,
    email: row.email_status ? { status: row.email_status, attempts: row.email_attempts, body: row.email_body } : null,
    marketing: row.status === "SUCCESS" ? {
      eligible_products: row.eligible_products || [],
      product_count: row.product_count ?? 0,
    } : null,
    _applicant: row.applicant_name,
    _at: row.created_at ? Date.parse(row.created_at) : null,
    _stored: true,
  }
}

export const money = (v) => (v == null ? "—" : "$" + Math.round(Number(v)).toLocaleString("en-US"))

export function inputsOf(row) {
  const i = row.inputs || {}
  const years = i.loan_term ? `${i.loan_term / 12} years` : "—"
  return [
    ["Applicant", row.applicant_name || "—"],
    ["Property value", money(i.property_value)],
    ["Loan amount", money(i.loan_amount)],
    ["Down payment", i.property_value != null ? money(i.property_value - i.loan_amount) : "—"],
    ["Term", years],
    ["Loan type", i.loan_type || "—"],
    ["Household income", i.annual_income != null ? `${money(i.annual_income)} / yr` : "—"],
    ["Existing debts", i.monthly_debts != null ? `${money(i.monthly_debts)} / mo` : "—"],
    ["Co-applicant", i.has_coapplicant ? "Yes" : "No"],
    ["Est. debt-to-income", i.dti != null ? `${Number(i.dti).toFixed(1)}%` : "—"],
    ["Loan-to-value", i.ltv != null ? `${Number(i.ltv).toFixed(1)}%` : "—"],
    ["Sex (monitoring only)", i.sex || "—"],
    ["Race (monitoring only)", i.race || "—"],
    ["Ethnicity (monitoring only)", i.ethnicity || "—"],
    ["Age (monitoring only)", i.age || "—"],
  ]
}

export function formatWhen(ts, opts = {}) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...opts,
  })
}
