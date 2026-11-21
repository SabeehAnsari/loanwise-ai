import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"
import BiasReport from "./BiasReport"
import { BIAS } from "../test/fixtures"

describe("BiasReport", () => {
  it("shows a cleared audit with gaps, intervals and group rates", () => {
    render(<BiasReport bias={BIAS} />)
    expect(screen.getByText("Cleared")).toBeInTheDocument()
    expect(screen.getByText("3.9%")).toBeInTheDocument()
    expect(screen.getByText("0.2% – 12.8%")).toBeInTheDocument()
    expect(screen.getByText("0.032")).toBeInTheDocument()
    expect(screen.getByText("n = 112")).toBeInTheDocument()
  })

  it("warns that automation is off when the audit fails", () => {
    render(<BiasReport bias={{ ...BIAS, decision: "FLAG FOR HUMAN REVIEW" }} />)
    expect(screen.getByText(/automation off/i)).toBeInTheDocument()
  })

  it("omits CI and rate sections for stored runs without them", () => {
    render(<BiasReport bias={{ decision: "CLEARED", bias_score: 0.03, threshold: 0.2, metrics: { gender_disparity: 0.04 }, stored: true }} />)
    expect(screen.queryByText("95% CI")).not.toBeInTheDocument()
    expect(screen.queryByText(/approval rate by group/i)).not.toBeInTheDocument()
    expect(screen.getByText(/as recorded when this application was run/)).toBeInTheDocument()
  })

  it("renders nothing without a report", () => {
    const { container } = render(<BiasReport bias={null} />)
    expect(container).toBeEmptyDOMElement()
  })
})
