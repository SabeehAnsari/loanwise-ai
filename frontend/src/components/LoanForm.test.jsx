import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LoanForm from "./LoanForm"

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
    expect(screen.getByText(/monthly income must be at least \$500/i)).toBeInTheDocument()
    expect(screen.getByText(/loan amount of at least 1/i)).toBeInTheDocument()
    expect(screen.getByLabelText("Full name")).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByLabelText("Full name")).toHaveFocus()
  })

  it("rejects a loan above the $10M cap", async () => {
    const { onSubmit, user } = setup()
    await user.click(screen.getByRole("button", { name: /strong applicant/i }))
    const amount = screen.getByLabelText("Amount")
    await user.clear(amount)
    await user.type(amount, "20000")
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByText(/maximum loan is 10,000/i)).toBeInTheDocument()
  })

  it("fills a sample applicant and submits numeric values", async () => {
    const { onSubmit, user } = setup()
    await user.click(screen.getByRole("button", { name: /strong applicant/i }))
    expect(screen.getByLabelText("Full name")).toHaveValue("Priya Raman")
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
      name: "Priya Raman", applicant_income: 5400, coapplicant_income: 1800, loan_amount: 128,
      loan_amount_term: 360, credit_history: 1,
    }))
  })

  it("sends an empty co-applicant income as 0 and trims the name", async () => {
    const { onSubmit, user } = setup()
    await user.type(screen.getByLabelText("Full name"), "  Jane Doe  ")
    await user.type(screen.getByLabelText("Applicant income"), "4000")
    await user.type(screen.getByLabelText("Amount"), "100")
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "Jane Doe", coapplicant_income: 0 })
  })

  it("updates segmented choices", async () => {
    const { onSubmit, user } = setup({ initial: undefined })
    await user.click(screen.getByRole("button", { name: /strong applicant/i }))
    await user.click(screen.getByRole("radio", { name: "Has defaults" }))
    await user.click(screen.getByRole("radio", { name: "Rural" }))
    await user.click(screen.getByRole("button", { name: /run decision/i }))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ credit_history: 0, property_area: 0 })
  })

  it("warns live when repayment is over the 60% rule", async () => {
    const { user } = setup()
    await user.click(screen.getByRole("button", { name: /fails rules/i }))
    expect(screen.getByText(/over the 60% rule/i)).toBeInTheDocument()
  })

  it("labels gender and marital status as audit-only", () => {
    setup()
    expect(screen.getByText(/not model inputs/i)).toBeInTheDocument()
    expect(screen.getByText(/changing them cannot change the score/i)).toBeInTheDocument()
  })

  it("disables the button while running", () => {
    setup({ loading: true })
    expect(screen.getByRole("button", { name: /running pipeline/i })).toBeDisabled()
  })
})
