import { describe, expect, it } from "vitest"
import { cardToBias, inputsOf, isV2, recordToResult } from "./records"
import { CARD, ROW, V1_ROW } from "../test/fixtures"

describe("isV2", () => {
  it("keeps v2 rows and hides v1 rows", () => {
    expect(isV2(ROW)).toBe(true)
    expect(isV2(V1_ROW)).toBe(false)
    expect(isV2({ model_version: "something-else" })).toBe(false)
  })
})

describe("recordToResult", () => {
  it("turns a stored v2 row into the /predict response shape", () => {
    const r = recordToResult(ROW, CARD)
    expect(r).toMatchObject({
      application_id: "app-1", model_version: "hmda-v2-ga2022", status: "SUCCESS", decision: "APPROVED",
      probability: 0.973, threshold: CARD.policy.threshold, _applicant: "Priya Raman", _stored: true,
    })
    expect(r._at).toBe(Date.parse(ROW.created_at))
    expect(r.derived).toEqual({ dti: 25.1, ltv: 80, monthly_payment: 1825.4, conforming: true })
    expect(r.bias_report).toMatchObject({ decision: "CLEARED", bias_score: 0.0618, stored: true })
    expect(r.bias_report.groups.length).toBe(CARD.fairness.groups.length)
    expect(r.email).toEqual({ status: "SENT", attempts: 1, body: "Dear Priya" })
    expect(r.marketing).toEqual({ eligible_products: ["Rate lock (60 days)"], product_count: 1 })
  })

  it("keeps explanation null for runs saved before factors were stored", () => {
    const { explanation: _e, ...old } = ROW
    expect(recordToResult(old, CARD).explanation).toBeNull()
  })

  it("has no fairness, email or products for a rule rejection", () => {
    const r = recordToResult({ ...ROW, status: "REJECTED_BY_RULES", decision: "DENIED", probability: null,
      bias_score: null, bias_decision: null, email_status: null, message: "Application rejected: x" }, CARD)
    expect(r.bias_report).toBeNull()
    expect(r.email).toBeNull()
    expect(r.marketing).toBeNull()
    expect(r.message).toBe("Application rejected: x")
  })

  it("coerces numeric strings from Postgres numerics", () => {
    const r = recordToResult({ ...ROW, probability: "0.5", bias_score: "0.1" }, CARD)
    expect(r.probability).toBe(0.5)
    expect(r.bias_report.bias_score).toBe(0.1)
  })
})

describe("inputsOf", () => {
  it("formats the stored mortgage application for display", () => {
    const rows = Object.fromEntries(inputsOf(ROW))
    expect(rows["Property value"]).toBe("$350,000")
    expect(rows["Down payment"]).toBe("$70,000")
    expect(rows["Term"]).toBe("30 years")
    expect(rows["Household income"]).toBe("$125,000 / yr")
    expect(rows["Est. debt-to-income"]).toBe("25.1%")
    expect(rows["Race (monitoring only)"]).toBe("Asian")
  })
})

describe("cardToBias", () => {
  it("maps the model card's gate and groups", () => {
    const b = cardToBias(CARD)
    expect(b).toMatchObject({ decision: "CLEARED", model_version: CARD.model_version, bias_score: CARD.fairness.gate.value,
      threshold: CARD.fairness.gate.limit, operating_threshold: CARD.fairness.threshold })
  })

  it("flags a failed gate", () => {
    const failed = { ...CARD, fairness: { ...CARD.fairness, gate: { ...CARD.fairness.gate, passed: false } } }
    expect(cardToBias(failed).decision).toBe("FLAG FOR HUMAN REVIEW")
  })
})
