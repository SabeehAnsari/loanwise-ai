import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderApp } from "../test/renderApp"
import { CARD } from "../test/fixtures"

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
    expect(screen.getByRole("tabpanel")).toHaveTextContent(/switches automation off/i)
    await user.keyboard("{ArrowRight}")
    expect(screen.getByRole("tab", { name: /letter/i })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tab", { name: /letter/i })).toHaveFocus()
    await user.keyboard("{ArrowRight}{ArrowRight}")
    expect(screen.getByRole("tab", { name: /rules/i })).toHaveAttribute("aria-selected", "true")
  })

  it("shows the real model figures", async () => {
    renderApp("/")
    expect((await screen.findAllByText(CARD.metrics.roc_auc.toFixed(3))).length).toBeGreaterThan(0)
    const rule = CARD.comparison.find((c) => c.name.startsWith("One-line rule"))
    expect(screen.getAllByText(rule.roc_auc.toFixed(3)).length).toBeGreaterThan(0)
  })
})
