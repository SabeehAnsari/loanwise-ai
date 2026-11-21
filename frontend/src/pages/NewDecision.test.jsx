import { afterEach, describe, expect, it, vi } from "vitest"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { json, renderApp } from "../test/renderApp"
import { APPROVED, RULES_REJECTED, USER } from "../test/fixtures"

afterEach(() => vi.unstubAllGlobals())

const pipeline = () => screen.getByRole("list", { name: /decision pipeline/i })

describe("New decision", () => {
  it("greets first-time users with a walkthrough", async () => {
    renderApp("/app/new", { user: USER })
    expect(await screen.findByRole("heading", { name: /welcome, alex reviewer/i })).toBeInTheDocument()
    expect(screen.getByText(/choose an applicant/i)).toBeInTheDocument()
  })

  it("hides the walkthrough once dismissed", async () => {
    const user = userEvent.setup()
    renderApp("/app/new", { user: USER })
    await user.click(await screen.findByRole("button", { name: /hide the walkthrough/i }))
    expect(screen.getByRole("heading", { name: /ready when you are/i })).toBeInTheDocument()
    expect(localStorage.getItem(`lw:intro-done:${USER.id}`)).toBe("1")
  })

  it("runs a sample and shows the result, lighting the deciding stage", async () => {
    const user = userEvent.setup()
    const predict = vi.fn(() => json(APPROVED))
    renderApp("/app/new", { user: USER, predict })
    await user.click(await screen.findByRole("button", { name: /run “strong applicant”/i }))
    expect(await screen.findByRole("heading", { name: "Approved" })).toBeInTheDocument()
    expect(predict).toHaveBeenCalledWith(expect.objectContaining({ name: "Priya Raman" }))
    const lit = within(pipeline()).getAllByRole("listitem").filter((li) => li.dataset.lit === "true")
    expect(lit).toHaveLength(1)
    expect(lit[0]).toHaveTextContent(/model \+ shap/i)
    expect(screen.getByRole("link", { name: /open as page/i })).toHaveAttribute("href", "/app/decisions/app-1")
  })

  it("auto-runs the sample passed from sign-up", async () => {
    const predict = vi.fn(() => json(APPROVED))
    renderApp("/app/new?sample=strong", { user: USER, predict })
    expect(await screen.findByRole("heading", { name: "Approved" })).toBeInTheDocument()
    expect(predict).toHaveBeenCalledTimes(1)
  })

  it("shows which business rule stopped a rejected application", async () => {
    renderApp("/app/new?sample=rules", { user: USER, predict: () => json(RULES_REJECTED) })
    expect(await screen.findByRole("heading", { name: "Business rules" })).toBeInTheDocument()
    expect(within(pipeline()).getByText("Failed")).toBeInTheDocument()
  })

  it("shows an error with a working retry", async () => {
    const user = userEvent.setup()
    let calls = 0
    const predict = vi.fn(() => (++calls === 1 ? json({}, 429) : json(APPROVED)))
    renderApp("/app/new?sample=strong", { user: USER, predict })
    expect(await screen.findByRole("alert")).toHaveTextContent(/10 applications in a minute/)
    await user.click(screen.getByRole("button", { name: /try again/i }))
    expect(await screen.findByRole("heading", { name: "Approved" })).toBeInTheDocument()
  })
})
