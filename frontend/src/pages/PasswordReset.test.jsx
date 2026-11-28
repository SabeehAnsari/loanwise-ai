import { describe, expect, it, vi, afterEach } from "vitest"
import { act, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { renderApp } from "../test/renderApp"
import { emitAuth, supabase } from "../test/supabaseMock"
import { linkError } from "./ResetPassword"

const USER = { id: "u1", email: "ada@example.com", user_metadata: { full_name: "Ada" } }

afterEach(() => {
  vi.clearAllMocks()
  window.location.hash = ""
})

describe("forgot password", () => {
  it("is linked from sign-in", async () => {
    renderApp("/signin")
    await userEvent.click(await screen.findByRole("link", { name: /forgot password/i }))
    expect(await screen.findByRole("heading", { name: /reset your password/i })).toBeInTheDocument()
  })

  it("sends a reset email that returns to /reset-password", async () => {
    renderApp("/forgot-password")
    await userEvent.type(await screen.findByLabelText(/email/i), "  ada@example.com ")
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }))

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith("ada@example.com", {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    // Same message whether or not the account exists.
    expect(await screen.findByRole("status")).toHaveTextContent(/if an account exists for ada@example.com/i)
  })

  it("shows service errors such as rate limits", async () => {
    supabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
      error: { status: 429, message: "Email rate limit exceeded" },
    })
    renderApp("/forgot-password")
    await userEvent.type(await screen.findByLabelText(/email/i), "ada@example.com")
    await userEvent.click(screen.getByRole("button", { name: /send reset link/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/rate limit/i)
  })
})

describe("reset password", () => {
  it("explains an invalid link when there is no recovery session", async () => {
    renderApp("/reset-password")
    expect(await screen.findByRole("heading", { name: /link not valid/i })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /request a new link/i })).toHaveAttribute("href", "/forgot-password")
  })

  it("reads Supabase's expired-link error from the URL hash", () => {
    expect(linkError("#error=access_denied&error_code=otp_expired")).toMatch(/expired/)
    expect(linkError("#error=x&error_description=Bad+link")).toBe("Bad link")
    expect(linkError("#access_token=abc&type=recovery")).toBeNull()
  })

  it("rejects mismatched passwords without calling Supabase", async () => {
    renderApp("/reset-password", { user: USER })
    await userEvent.type(await screen.findByLabelText(/^new password/i), "secret123")
    await userEvent.type(screen.getByLabelText(/confirm/i), "secret124")
    await userEvent.click(screen.getByRole("button", { name: /save new password/i }))
    expect(await screen.findByRole("alert")).toHaveTextContent(/don't match/i)
    expect(supabase.auth.updateUser).not.toHaveBeenCalled()
  })

  it("saves the new password and opens the app", async () => {
    renderApp("/reset-password", { user: USER })
    await userEvent.type(await screen.findByLabelText(/^new password/i), "secret123")
    await userEvent.type(screen.getByLabelText(/confirm/i), "secret123")
    await userEvent.click(screen.getByRole("button", { name: /save new password/i }))
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: "secret123" })
    expect(await screen.findByRole("heading", { name: /new decision/i, level: 1 })).toBeInTheDocument()
  })

  it("sends a recovery sign-in to the reset page wherever it lands", async () => {
    renderApp("/")
    await screen.findAllByRole("link", { name: /sign in/i })
    act(() => emitAuth("PASSWORD_RECOVERY", USER))
    expect(await screen.findByRole("heading", { name: /choose a new password/i })).toBeInTheDocument()
  })
})
