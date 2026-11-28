import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { Factors, RulesTable, Verdict } from "./DecisionCard"
import { APPROVED, EXPLANATION, REFERRED, RULES_REJECTED } from "../test/fixtures"

const resultOf = (rule) => within(screen.getByRole("row", { name: new RegExp(rule) })).getAllByRole("cell").at(-1)

describe("RulesTable", () => {
  it("marks the loan-to-value rule failed and earlier rules passed", () => {
    render(<RulesTable message={RULES_REJECTED.message} />)
    expect(resultOf("Household income")).toHaveTextContent("Passed")
    expect(resultOf("Loan-to-value")).toHaveTextContent("Failed")
    expect(resultOf("Estimated debt-to-income")).toHaveTextContent("Not checked")
  })

  it("marks the debt-to-income rule failed without confusing it with income", () => {
    render(<RulesTable message="Application rejected: estimated debt-to-income ratio of 64.9% exceeds maximum allowed 60%" />)
    expect(resultOf("Household income")).toHaveTextContent("Passed")
    expect(resultOf("Estimated debt-to-income")).toHaveTextContent("Failed")
  })
})

describe("Verdict", () => {
  const renderVerdict = (result, props) => render(<MemoryRouter><Verdict result={result} {...props} /></MemoryRouter>)

  it("shows the decision and probability", () => {
    renderVerdict({ ...APPROVED, _applicant: "Priya Raman" })
    expect(screen.getByRole("heading", { name: "Approved" })).toBeInTheDocument()
    expect(screen.getByText("97.3%")).toBeInTheDocument()
    expect(screen.getByText("Priya Raman")).toBeInTheDocument()
    const t = Math.round(APPROVED.threshold * 100)
    expect(screen.getByRole("img", { name: new RegExp(`97\\.3 percent against an auto-approve threshold of ${t} percent`) })).toBeInTheDocument()
    expect(screen.getByText("25.1%")).toBeInTheDocument()          // estimated debt-to-income
    expect(screen.getByText("$1,825/mo")).toBeInTheDocument()
  })

  it("explains a referral instead of a denial", () => {
    renderVerdict(REFERRED)
    expect(screen.getByRole("heading", { name: "Referred" })).toBeInTheDocument()
    expect(screen.getByText(/below the auto-approve threshold/)).toBeInTheDocument()
    expect(screen.getByText(/never denies an application/)).toBeInTheDocument()
  })

  it("links to the saved decision page when asked", () => {
    renderVerdict(APPROVED, { showLink: true })
    expect(screen.getByRole("link", { name: /open as page/i })).toHaveAttribute("href", "/app/decisions/app-1")
  })

  it("shows the rejection reason and no probability for rule rejections", () => {
    renderVerdict(RULES_REJECTED)
    expect(screen.getByRole("heading", { name: "Denied" })).toBeInTheDocument()
    expect(screen.getByText(/105\.0%/)).toBeInTheDocument()
    expect(screen.queryByText(/approval probability/)).not.toBeInTheDocument()
  })
})

describe("Factors", () => {
  it("lists factors with signed values and direction for screen readers", () => {
    render(<Factors explanation={EXPLANATION} />)
    expect(screen.getByText("+0.61")).toBeInTheDocument()
    expect(screen.getByText("−0.19")).toBeInTheDocument()
    expect(screen.getByText(/hurts approval,/)).toBeInTheDocument()
  })

  it("says when a stored run has no factors", () => {
    render(<Factors explanation={null} stored />)
    expect(screen.getByText(/weren’t stored for this run/)).toBeInTheDocument()
  })

  it("renders nothing for an empty list", () => {
    const { container } = render(<Factors explanation={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})
