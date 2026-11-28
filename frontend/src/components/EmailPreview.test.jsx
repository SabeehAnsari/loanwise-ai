import { describe, expect, it, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EmailPreview, Products } from "./EmailPreview"
import { APPROVED } from "../test/fixtures"

describe("EmailPreview", () => {
  it("splits the letter from the offers and shows delivery", () => {
    render(<EmailPreview email={APPROVED.email} />)
    expect(screen.getByText(/Dear Priya/)).toBeInTheDocument()
    expect(screen.getByText("Personalised offers")).toBeInTheDocument()
    expect(screen.getByText(/attempt 1 of 3/)).toBeInTheDocument()
    expect(screen.getByText(/Sent to reviewer@example.com/)).toBeInTheDocument()
  })

  it("copies the letter text", async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
    render(<EmailPreview email={APPROVED.email} />)
    await user.click(screen.getByRole("button", { name: /copy text/i }))
    expect(writeText).toHaveBeenCalledWith(APPROVED.email.body)
    expect(await screen.findByRole("button", { name: /copied/i })).toBeInTheDocument()
  })

  it("explains a letter held for human review", () => {
    render(<EmailPreview email={{ status: "HUMAN_REVIEW", attempts: 3, body: null }} />)
    expect(screen.getByText(/held for human review/i)).toBeInTheDocument()
    expect(screen.getByText(/failed the guardrails 3 times/)).toBeInTheDocument()
  })

  it("does not claim delivery status for stored runs", () => {
    render(<EmailPreview email={{ status: "SENT", attempts: 1, body: "Dear X" }} />)
    expect(screen.queryByText(/Sent to|Not delivered/)).not.toBeInTheDocument()
  })
})

describe("Products", () => {
  it("lists eligible products", () => {
    render(<Products marketing={APPROVED.marketing} />)
    expect(screen.getByText("Rate lock (60 days)")).toBeInTheDocument()
  })

  it("says when nothing matches", () => {
    render(<Products marketing={{ eligible_products: [], product_count: 0 }} />)
    expect(screen.getByText(/no products match/i)).toBeInTheDocument()
  })
})
