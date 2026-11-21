import { describe, expect, it } from "vitest"
import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { Factors, RulesTable, Verdict } from "./DecisionCard"
import { APPROVED, EXPLANATION, RULES_REJECTED } from "../test/fixtures"

const resultOf = (rule) => within(screen.getByRole("row", { name: new RegExp(rule) })).getAllByRole("cell").at(-1)

describe("RulesTable", () => {
  it("marks the repayment rule failed without confusing it with the income rule", () => {
    render(<RulesTable message={RULES_REJECTED.message} />)
    expect(resultOf("Combined monthly income")).toHaveTextContent("Passed")
    expect(resultOf("Loan amount cap")).toHaveTextContent("Passed")
    expect(resultOf("Repayment-to-income")).toHaveTextContent("Failed")
  })

  it("marks later rules as not checked when an early one fails", () => {
    render(<RulesTable message="Application rejected: minimum combined monthly income requirement is $500" />)
    expect(resultOf("Combined monthly income")).toHaveTextContent("Failed")
    expect(resultOf("Repayment-to-income")).toHaveTextContent("Not checked")
  })
})

describe("Verdict", () => {
  const renderVerdict = (result, props) => render(<MemoryRouter><Verdict result={result} {...props} /></MemoryRouter>)

  it("shows the decision and probability", () => {
    renderVerdict({ ...APPROVED, _applicant: "Priya Raman" })
    expect(screen.getByRole("heading", { name: "Approved" })).toBeInTheDocument()
    expect(screen.getByText("84.2%")).toBeInTheDocument()
    expect(screen.getByText("Priya Raman")).toBeInTheDocument()
    expect(screen.getByRole("img", { name: /84\.2 percent against a 50 percent cut-off/ })).toBeInTheDocument()
  })

  it("links to the saved decision page when asked", () => {
    renderVerdict(APPROVED, { showLink: true })
    expect(screen.getByRole("link", { name: /open as page/i })).toHaveAttribute("href", "/app/decisions/app-1")
  })

  it("shows the rejection reason and no probability for rule rejections", () => {
    renderVerdict(RULES_REJECTED)
    expect(screen.getByRole("heading", { name: "Denied" })).toBeInTheDocument()
    expect(screen.getByText(/113\.6%/)).toBeInTheDocument()
    expect(screen.queryByText(/approval probability/)).not.toBeInTheDocument()
  })
})

describe("Factors", () => {
  it("lists factors with signed values and direction for screen readers", () => {
    render(<Factors explanation={EXPLANATION} />)
    expect(screen.getByText("+1.42")).toBeInTheDocument()
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
