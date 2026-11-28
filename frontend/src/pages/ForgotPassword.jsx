import { useState } from "react"
import { Link } from "react-router"
import { supabase } from "../supabaseClient"
import AuthLayout from "../components/AuthLayout"
import { Alert, ArrowRight, Check } from "../components/Icons"

export const RESET_PATH = "/reset-password"

export default function ForgotPassword() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      // The link in the email brings the user back to this app's reset page. Supabase only
      // honours it if the URL is in Authentication → URL Configuration → Redirect URLs.
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}${RESET_PATH}`,
      })
      // Rate limits and invalid addresses are worth showing; whether an account exists is not.
      if (error && error.status !== 404) setError(error.message)
      else setSent(true)
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll email you a link to choose a new one.">
      {sent ? (
        <div className="auth-form">
          <div className="alert" data-tone="pass" role="status">
            <Check size={16} />
            <span>If an account exists for <b>{email.trim()}</b>, a reset link is on its way. It works once and expires after an hour.</span>
          </div>
          <p className="field-hint" style={{ marginTop: 0 }}>No email after a few minutes? Check spam, or try again.</p>
          <button type="button" className="btn btn-glass btn-block" onClick={() => setSent(false)}>Send another link</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="auth-form">
          <div>
            <label className="field-label" htmlFor="f-email">Email</label>
            <input id="f-email" className="input" type="email" value={email} autoComplete="email"
              onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          {error && <div className="alert" data-tone="fail" role="alert"><Alert size={16} />{error}</div>}
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
            <span>{loading ? "One moment…" : "Send reset link"}</span>
            <ArrowRight size={18} className="nudge" />
          </button>
        </form>
      )}
      <p className="auth-switch">Remembered it? <Link className="link" to="/signin">Back to sign in</Link></p>
    </AuthLayout>
  )
}
