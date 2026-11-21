// Turn a stored `applications` row (see docs/supabase_schema.sql) into the same
// shape as a /predict response, so history and detail pages reuse the result views.
export function recordToResult(row, report) {
  const audit = report?.fairness_audit
  const hasBias = row.bias_score != null || row.bias_decision
  const bias = hasBias ? {
    decision: row.bias_decision,
    bias_score: row.bias_score != null ? Number(row.bias_score) : null,
    threshold: audit?.threshold ?? 0.2,
    metrics: {
      gender_disparity: num(row.gender_disparity),
      married_disparity: num(row.married_disparity),
      fnr_disparity: num(row.fnr_disparity),
    },
    stored: true,
  } : null

  return {
    application_id: row.id,
    status: row.status,
    decision: row.decision,
    probability: row.probability != null ? Number(row.probability) : null,
    message: row.message ?? null,
    explanation: Array.isArray(row.explanation) ? row.explanation : null,
    bias_report: bias,
    email: row.email_status ? {
      status: row.email_status,
      attempts: row.email_attempts,
      body: row.email_body,
    } : null,
    marketing: row.status === "SUCCESS" ? {
      eligible_products: row.eligible_products || [],
      product_count: row.product_count ?? 0,
    } : null,
    _applicant: row.applicant_name,
    _at: row.created_at ? Date.parse(row.created_at) : null,
    _stored: true,
  }
}

const num = (v) => (v == null ? null : Number(v))

export function inputsOf(row) {
  const yesNo = (v) => (v === 1 ? "Yes" : v === 0 ? "No" : "—")
  const areas = { 0: "Rural", 1: "Semi-urban", 2: "Urban" }
  const money = (v) => (v == null ? "—" : "$" + Number(v).toLocaleString("en-US"))
  return [
    ["Applicant", row.applicant_name || "—"],
    ["Dependents", row.dependents === 3 ? "3+" : row.dependents ?? "—"],
    ["Education", row.education === 1 ? "Graduate" : row.education === 0 ? "Not graduate" : "—"],
    ["Employment", row.self_employed === 1 ? "Self-employed" : row.self_employed === 0 ? "Salaried" : "—"],
    ["Monthly income", money(row.applicant_income)],
    ["Co-applicant income", money(row.coapplicant_income)],
    ["Credit history", Number(row.credit_history) === 1 ? "No defaults" : "Has defaults"],
    ["Property area", areas[row.property_area] ?? "—"],
    ["Loan amount", row.loan_amount == null ? "—" : money(Number(row.loan_amount) * 1000)],
    ["Term", row.loan_amount_term ? `${row.loan_amount_term} months` : "—"],
    ["Gender (audit only)", row.gender === 1 ? "Male" : row.gender === 0 ? "Female" : "—"],
    ["Married (audit only)", yesNo(row.married)],
  ]
}

export function formatWhen(ts, opts = {}) {
  if (!ts) return "—"
  return new Date(ts).toLocaleString("en-GB", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", ...opts,
  })
}

// The /model fairness_audit block in the shape BiasReport expects.
export function auditToBias(audit, version) {
  if (!audit) return null
  return { ...audit, decision: audit.passed ? "CLEARED" : "FLAG FOR HUMAN REVIEW", model_version: version }
}
