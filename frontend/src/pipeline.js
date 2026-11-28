// Turns a /predict response into the five pipeline stages shown in the rail.
export const STAGES = [
  { id: "rules", short: "Rules", name: "Business rules", desc: "Income, loan-to-value, debt-to-income" },
  { id: "model", short: "Model", name: "Model + SHAP", desc: "XGBoost score, top factors" },
  { id: "fairness", short: "Fairness", name: "Fairness gate", desc: "Model-level audit" },
  { id: "email", short: "Letter", name: "Email guardrails", desc: "LLM letter, 3 attempts" },
  { id: "products", short: "Products", name: "Products", desc: "Rule-based eligibility" },
]

const skip = { tone: "skip", value: "Skipped" }

export function stageResults(result) {
  if (!result) return {}
  const rejected = result.status === "REJECTED_BY_RULES"
  if (rejected) {
    return {
      rules: { tone: "fail", value: "Failed" },
      model: skip, fairness: skip, email: skip, products: skip,
      focus: "rules",
    }
  }

  const out = { rules: { tone: "pass", value: "Passed" } }
  const pct = typeof result.probability === "number" ? `${(result.probability * 100).toFixed(1)}%` : "—"
  out.model = {
    tone: result.decision === "APPROVED" ? "pass" : "warn",
    value: pct,
  }

  const bias = result.bias_report
  const cleared = bias?.decision === "CLEARED"
  out.fairness = bias ? { tone: cleared ? "pass" : "fail", value: cleared ? "Cleared" : "Failed" } : skip

  if (!cleared) {
    out.email = skip
    out.products = skip
    out.focus = "fairness"
    return out
  }

  const email = result.email
  if (email?.status === "HUMAN_REVIEW") {
    out.email = { tone: "warn", value: "Review" }
    out.products = skip
    out.focus = "email"
    return out
  }
  const tries = email?.attempts ?? 1
  out.email = { tone: "pass", value: `${tries} ${tries === 1 ? "try" : "tries"}` }

  const count = result.marketing?.product_count ?? 0
  out.products = { tone: count > 0 ? "pass" : "skip", value: `${count} eligible` }
  out.focus = "model"
  return out
}

// The v2 model never denies: it auto-approves or refers the application to a loan officer.
export function verdictOf(result) {
  if (result.status === "REJECTED_BY_RULES") return { word: "Denied", tone: "fail", by: "business rules" }
  if (result.status === "HUMAN_REVIEW") return { word: "In review", tone: "warn", by: "human review" }
  if (result.decision === "APPROVED") return { word: "Approved", tone: "pass", by: "model" }
  if (result.decision === "REFERRED") return { word: "Referred", tone: "warn", by: "model" }
  return { word: "Denied", tone: "fail", by: "model" }
}
