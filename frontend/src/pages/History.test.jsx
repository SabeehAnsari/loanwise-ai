import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { json, renderApp } from "../test/renderApp"
import { ROW, USER, V1_ROW } from "../test/fixtures"

afterEach(() => vi.unstubAllGlobals())

const ROWS = [
  ROW,
  { ...ROW, id: "app-2", applicant_name: "Daniel Okafor", decision: "REFERRED", probability: 0.87 },
  { ...ROW, id: "app-3", applicant_name: "Mara Lindqvist", status: "REJECTED_BY_RULES", decision: "DENIED", probability: null },
  { ...ROW, id: "app-4", applicant_name: "John Smith", status: "HUMAN_REVIEW" },
  V1_ROW,
]

describe("History", () => {
  it("lists every saved application with its outcome", async () => {
    renderApp("/app/history", { user: USER, applications: ROWS })
    expect(await screen.findByRole("link", { name: "Priya Raman" })).toHaveAttribute("href", "/app/decisions/app-1")
    expect(screen.getByText("Denied by rules")).toBeInTheDocument()
    expect(screen.getByText("In review")).toBeInTheDocument()
    expect(screen.getByText("Referred", { selector: ".status" })).toBeInTheDocument()
    expect(screen.getAllByText("$280,000 · 30 yr").length).toBe(4)
    expect(screen.getByText(/4 decisions · 1 auto-approved · 1 referred to a loan officer · 1 stopped by rules · 1 held for review/)).toBeInTheDocument()
    expect(screen.queryByText("Old Run")).not.toBeInTheDocument()          // v1 runs are hidden
  })

  it("filters by outcome and searches by name", async () => {
    const user = userEvent.setup()
    renderApp("/app/history", { user: USER, applications: ROWS })
    await screen.findByText("Priya Raman")
    await user.click(screen.getByRole("radio", { name: /rules/i }))
    expect(screen.getByText("Mara Lindqvist")).toBeInTheDocument()
    expect(screen.queryByText("Priya Raman")).not.toBeInTheDocument()
    await user.click(screen.getByRole("radio", { name: /^all/i }))
    await user.type(screen.getByRole("searchbox", { name: /search/i }), "okaf")
    expect(screen.getByText("Daniel Okafor")).toBeInTheDocument()
    expect(screen.queryByText("John Smith")).not.toBeInTheDocument()
  })

  it("explains when a search matches nothing and can clear it", async () => {
    const user = userEvent.setup()
    renderApp("/app/history", { user: USER, applications: ROWS })
    await screen.findByText("Priya Raman")
    await user.type(screen.getByRole("searchbox", { name: /search/i }), "zzz")
    expect(screen.getByRole("heading", { name: /nothing matches/i })).toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: /clear filters/i }))
    expect(screen.getByText("Priya Raman")).toBeInTheDocument()
  })

  it("invites a first run when there is no history", async () => {
    renderApp("/app/history", { user: USER, applications: [] })
    expect(await screen.findByRole("heading", { name: /no decisions yet/i })).toBeInTheDocument()
  })

  it("shows an error and retries", async () => {
    const user = userEvent.setup()
    let calls = 0
    renderApp("/app/history", { user: USER, applications: () => (++calls === 1 ? json({}, 500) : json({ applications: ROWS })) })
    expect(await screen.findByRole("alert")).toHaveTextContent(/couldn’t load your history/i)
    await user.click(screen.getByRole("button", { name: /try again/i }))
    expect(await screen.findByText("Priya Raman")).toBeInTheDocument()
  })
})
