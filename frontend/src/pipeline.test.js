import { describe, expect, it } from "vitest"
import { stageResults, verdictOf } from "./pipeline"
import { APPROVED, BIAS, RULES_REJECTED } from "./test/fixtures"

describe("stageResults", () => {
  it("returns nothing before a run", () => {
    expect(stageResults(null)).toEqual({})
  })

  it("marks every stage after a full approval and lights the model", () => {
    const s = stageResults(APPROVED)
    expect(s.rules).toEqual({ tone: "pass", value: "Passed" })
    expect(s.model).toEqual({ tone: "pass", value: "84.2%" })
    expect(s.fairness).toEqual({ tone: "pass", value: "Cleared" })
    expect(s.email).toEqual({ tone: "pass", value: "1 try" })
    expect(s.products).toEqual({ tone: "pass", value: "1 eligible" })
    expect(s.focus).toBe("model")
  })

  it("stops at the rules and skips everything after a rule rejection", () => {
    const s = stageResults(RULES_REJECTED)
    expect(s.rules.tone).toBe("fail")
    expect([s.model, s.fairness, s.email, s.products].every((x) => x.tone === "skip")).toBe(true)
    expect(s.focus).toBe("rules")
  })

  it("lights the fairness gate when the audit fails", () => {
    const s = stageResults({ ...APPROVED, status: "HUMAN_REVIEW", decision: "PENDING", bias_report: { ...BIAS, decision: "FLAG FOR HUMAN REVIEW" }, email: null })
    expect(s.fairness).toEqual({ tone: "fail", value: "Failed" })
    expect(s.email.tone).toBe("skip")
    expect(s.focus).toBe("fairness")
  })

  it("lights the email stage when guardrails send it to review", () => {
    const s = stageResults({ ...APPROVED, status: "HUMAN_REVIEW", email: { status: "HUMAN_REVIEW", attempts: 3, body: null }, marketing: null })
    expect(s.email).toEqual({ tone: "warn", value: "Review" })
    expect(s.products.tone).toBe("skip")
    expect(s.focus).toBe("email")
  })

  it("pluralises attempts", () => {
    expect(stageResults({ ...APPROVED, email: { ...APPROVED.email, attempts: 2 } }).email.value).toBe("2 tries")
  })

  it("colours the model stage by the decision", () => {
    expect(stageResults({ ...APPROVED, decision: "DENIED" }).model.tone).toBe("fail")
  })
})

describe("verdictOf", () => {
  it.each([
    [APPROVED, "Approved", "pass", "model"],
    [{ ...APPROVED, decision: "DENIED" }, "Denied", "fail", "model"],
    [RULES_REJECTED, "Denied", "fail", "business rules"],
    [{ ...APPROVED, status: "HUMAN_REVIEW" }, "In review", "warn", "human review"],
  ])("maps %# to %s", (result, word, tone, by) => {
    expect(verdictOf(result)).toEqual({ word, tone, by })
  })
})
