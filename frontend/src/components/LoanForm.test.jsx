import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LoanForm from "./LoanForm"
import { estimate, monthlyPayment } from "../lib/mortgage"

function setup(props = {}) {
  const onSubmit = vi.fn()
  render(<LoanForm onSubmit={onSubmit} loading={false} {...props} />)
  return { onSubmit, user: userEvent.setup() }
}

describe("LoanForm", () => {
  it("blocks submission and explains each invalid field", async () => {
    const { onSubmit, user } = setup()
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/enter the applicant's full name/i)).toBeInTheDocument()
    expect(screen.getByText(/property's price or value/i)).toBeInTheDocument()
    expect(screen.getByText(/how much you want to borrow/i)).toBeInTheDocument()
    expect(screen.getByText(/household income before tax/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Full name")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Full name")).toHaveFocus()
  })

  it("rejects a loan above the $10M cap", async () => {
    const { onSubmit, user } = setup()
    await user.click(screen.getByRole("button", { name: /strong applicant/i }))
    const amount = screen.getByLabelText("Loan amount")
    await user.clear(amount)
    await user.type(amount, "20000000")
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/maximum loan is \$10,000,000/i)).toBeInTheDocument()
  })

  it("fills a sample applicant and submits numeric values", async () => {
    const { onSubmit, user } = setup()
    await user.click(screen.getByRole("button", { name: /strong applicant/i }))
    expect(screen.getByLabelText("Full name")).toHaveValue("Priya Raman")
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: "Priya Raman", property_value: 350000, loan_amount: 280000, annual_income: 125000,
      monthly_debts: 350, loan_term: 360, loan_type: "Conventional", has_coapplicant: true,
    }))
  })

  it("sends empty existing debts as 0 and trims the name", async () => {
    const { onSubmit, user } = setup()
    await user.type(screen.getByLabelText("Full name"), "  Jane Doe  ")
    await user.type(screen.getByLabelText("Property value"), "300000")
    await user.type(screen.getByLabelText("Loan amount"), "240000")
    await user.type(screen.getByLabelText("Household income"), "90000")
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "Jane Doe", monthly_debts: 0, has_coapplicant: false })
  })

  it("updates loan type, term, co-applicant and monitoring choices", async () => {
    const { onSubmit, user } = setup()
    await user.click(screen.getByRole("button", { name: /strong applicant/i }))
    await user.selectOptions(screen.getByLabelText("Loan type"), "FHA")
    await user.selectOptions(screen.getByLabelText("Term"), "180")
    await user.click(screen.getByRole("radio", { name: "Applying alone" }))
    await user.selectOptions(screen.getByLabelText("Race"), "Not provided")
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ loan_type: "FHA", loan_term: 180, has_coapplicant: false, race: "Not provided" })
  })

  it("shows live loan-to-value and debt-to-income against the rules", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: /loan above value/i }))
    expect(screen.getByText(/over the 100% rule/)).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /strong applicant/i }))
    expect(screen.queryByText(/over the/)).not.toBeInTheDocument()
    expect(screen.getByText(/down payment \$70,000/i)).toBeInTheDocument()
  })

  it("labels the monitoring fields as optional and audit-only", () => {
    setup()
    expect(screen.getByText(/optional · not model inputs/i)).toBeInTheDocument()
    expect(screen.getByText(/changing them cannot change the score/i)).toBeInTheDocument()
  })

  it("disables the button while running", () => {
    setup({ loading: true })
    expect(screen.getByRole("button", { name: /running pipeline/i })).toBeDisabled()
  })
})

describe("mortgage estimates (mirror ml/serving.py)", () => {
  it("computes the annuity payment", () => {
    expect(monthlyPayment(300000, 360, 0.06)).toBeCloseTo(1798.65, 2)
  })

  it("matches the backend's estimate for the strong sample", () => {
    const e = estimate({ loan_amount: 280000, property_value: 350000, annual_income: 125000, monthly_debts: 350, loan_term: 360 })
    expect(e.ltv).toBeCloseTo(80, 5)
    expect(e.dti).toBeCloseTo(25.1, 1)           // backend: 25.1 for the same inputs
    expect(e.payment).toBeCloseTo(1825.4, 1)
    expect(e.conforming).toBe(true)
  })
})
