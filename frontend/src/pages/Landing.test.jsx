import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderApp } from "../test/renderApp"

afterEach(() => vi.unstubAllGlobals())

describe("Landing stage demo", () => {
  it("opens on the model stage", async () => {
    renderApp("/")
    expect(await screen.findByRole("tab", { name: /model/i })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/approved/i)
  })

  it("switches stages by click and arrow keys", async () => {
    const user = userEvent.setup()
    renderApp("/")
    await user.click(await screen.findByRole("tab", { name: /fairness/i }))
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/switch automation off/i)
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: /letter/i })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: /letter/i })).toHaveFocus()
    await user.keyboard("{ArrowRight}{ArrowRight}")
    expect(screen.getByRole("tab", { name: /rules/i })).toHaveAttribute("aria-selected", "true")
  })

  it("shows the real model figures", async () => {
    renderApp("/")
    expect((await screen.findAllByText("0.768")).length).toBeGreaterThan(0)
    expect(screen.getAllByText("0.705").length).toBeGreaterThan(0)
  })
})
