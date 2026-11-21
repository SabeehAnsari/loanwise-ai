import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderApp } from "../test/renderApp"
import { ROW, USER } from "../test/fixtures"

afterEach(() => vi.unstubAllGlobals())

describe("Decision detail", () => {
  it("shows the saved decision and its inputs", async () => {
    renderApp("/app/decisions/app-1", { user: USER, applications: [ROW] })
    expect(await screen.findByRole("heading", { name: "Approved" })).toBeInTheDocument()
    expect(screen.getByText("Credit history", { selector: "span" })).toBeInTheDocument()
    expect(screen.getByText("$128,000")).toBeInTheDocument()
    const back = screen.getAllByRole("link", { name: /^history$/i })
    expect(back.every((a) => a.getAttribute("href") === "/app/history")).toBe(true)
  })

  it("explains when factors weren't stored for an older run", async () => {
    const { explanation: _e, ...old } = ROW
    renderApp("/app/decisions/app-1", { user: USER, applications: [old] })
    expect(await screen.findByText(/weren’t stored for this run/)).toBeInTheDocument()
  })

  it("says when the decision doesn't exist", async () => {
    renderApp("/app/decisions/missing", { user: USER, applications: [ROW] })
    expect(await screen.findByRole("heading", { name: /decision not found/i })).toBeInTheDocument()
  })
})
