import { afterEach, describe, expect, it, vi } from "vitest"
import { screen } from "@testing-library/react"
import { renderApp } from "./test/renderApp"
import { USER } from "./test/fixtures"

afterEach(() => vi.unstubAllGlobals())

describe("routing", () => {
  it("shows the public landing page to signed-out visitors", async () => {
    renderApp("/")
    expect(await screen.findByRole("heading", { level: 1, name: /mortgage decisions that show their working/i })).toBeInTheDocument()
    expect(screen.getAllByRole("link", { name: /try the demo/i })[0]).toHaveAttribute("href", "/signup?sample=strong")
  })

  it("offers to open the app when already signed in", async () => {
    renderApp("/", { user: USER })
    expect(await screen.findByRole("link", { name: /open the app/i })).toHaveAttribute("href", "/app/new")
  })

  it("sends signed-out visitors from the app to sign in", async () => {
    renderApp("/app/history")
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument()
  })

  it("keeps signed-in users out of the sign-in page", async () => {
    renderApp("/signin", { user: USER })
    expect(await screen.findByRole("heading", { name: "New decision" })).toBeInTheDocument()
  })

  it("redirects /app to New decision", async () => {
    renderApp("/app", { user: USER })
    expect(await screen.findByRole("heading", { name: "New decision" })).toBeInTheDocument()
  })

  it("shows a 404 for unknown paths", async () => {
    renderApp("/nope")
    expect(await screen.findByRole("heading", { name: "404" })).toBeInTheDocument()
  })

  it("marks the current page in the sidebar", async () => {
    renderApp("/app/model", { user: USER })
    expect(await screen.findByRole("link", { name: /model & fairness/i })).toHaveAttribute("aria-current", "page")
  })
})
