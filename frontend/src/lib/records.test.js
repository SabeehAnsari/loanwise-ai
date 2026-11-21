import { describe, expect, it } from "vitest"
import { auditToBias, inputsOf, recordToResult } from "./records"
import { ROW } from "../test/fixtures"
import { PUBLISHED_REPORT } from "../useModelReport"

describe("recordToResult", () => {
  it("turns a stored row into the /predict response shape", () => {
    const r = recordToResult(ROW, PUBLISHED_REPORT)
    expect(r).toMatchObject({
      application_id: "app-1", status: "SUCCESS", decision: "APPROVED", probability: 0.842,
      _applicant: "Priya Raman", _stored: true,
    })
    expect(r._at).toBe(Date.parse(ROW.created_at))
    expect(r.explanation).toHaveLength(2)
    expect(r.bias_report).toMatchObject({ decision: "CLEARED", bias_score: 0.032, threshold: 0.2, stored: true })
    expect(r.email).toEqual({ status: "SENT", attempts: 1, body: "Dear Priya" })
    expect(r.marketing).toEqual({ eligible_products: ["Fixed-rate Refinance"], product_count: 1 })
  })

  it("keeps explanation null for runs saved before factors were stored", () => {
    const { explanation: _e, ...old } = ROW
    expect(recordToResult(old, null).explanation).toBeNull()
  })

  it("has no fairness, email or products for a rule rejection", () => {
    const r = recordToResult({ ...ROW, status: "REJECTED_BY_RULES", decision: "DENIED", probability: null,
      bias_score: null, bias_decision: null, email_status: null, message: "Application rejected: x" }, null)
    expect(r.bias_report).toBeNull()
    expect(r.email).toBeNull()
    expect(r.marketing).toBeNull()
    expect(r.probability).toBeNull()
    expect(r.message).toBe("Application rejected: x")
  })

  it("coerces numeric strings from Postgres numerics", () => {
    const r = recordToResult({ ...ROW, probability: "0.5", bias_score: "0.1" }, null)
    expect(r.probability).toBe(0.5)
    expect(r.bias_report.bias_score).toBe(0.1)
  })
})

describe("inputsOf", () => {
  it("formats the stored application for display", () => {
    const rows = Object.fromEntries(inputsOf(ROW))
    expect(rows["Dependents"]).toBe("3+")
    expect(rows["Monthly income"]).toBe("$5,400")
    expect(rows["Loan amount"]).toBe("$128,000")
    expect(rows["Property area"]).toBe("Urban")
    expect(rows["Gender (audit only)"]).toBe("Female")
    expect(rows["Married (audit only)"]).toBe("Yes")
  })
})

describe("auditToBias", () => {
  it("maps the model card audit to a cleared bias report", () => {
    const b = auditToBias(PUBLISHED_REPORT.fairness_audit, "v1")
    expect(b).toMatchObject({ decision: "CLEARED", model_version: "v1", bias_score: 0.032 })
  })

  it("flags a failed audit", () => {
    expect(auditToBias({ passed: false }, "v1").decision).toBe("FLAG FOR HUMAN REVIEW")
  })
})
