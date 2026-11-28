import { useState } from "react"
import { Link, useNavigate } from "react-router"
import { supabase } from "../supabaseClient"
import { useAuth } from "../lib/auth"
import AuthLayout from "../components/AuthLayout"
import { Alert, ArrowRight } from "../components/Icons"

const MIN_LENGTH = 6

// Supabase reports a bad or expired link in the URL hash, e.g.
// #error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
// eslint-disable-next-line react-refresh/only-export-components
export function linkError(hash = window.location.hash) {
  const params = new URLSearchParams(hash.replace(/^#/, ""))
  if (!params.get("error") && !params.get("error_code")) return null
  return params.get("error_code") === "otp_expired"
    ? "This reset link has expired or has already been used."
    : params.get("error_description") || "This reset link isn't valid."
}

export default function ResetPassword() {
  const { user, ready, endRecovery } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [badLink] = useState(() => linkError())

  if (!ready) {
    return <div className="boot" aria-label="Loading"><div className="boot-bar" /></div>
  }

  // Following the emailed link signs the user in for this one purpose. Without that session
  // (link expired, already used, or opened in another browser) there is nothing to update.
  if (badLink || !user) {
    return (
      <AuthLayout title="Link not valid" subtitle={badLink || "This reset link is invalid or has expired."}>
        <div className="auth-form">
          <Link to="/forgot-password" className="btn btn-primary btn-lg btn-block">
            <span>Request a new link</span><ArrowRight size={18} className="nudge" />
          </Link>
        </div>
        <p className="auth-switch"><Link className="link" to="/signin">Back to sign in</Link></p>
      </AuthLayout>
    )
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`)
    if (password !== confirm) return setError("The two passwords don't match.")
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        return
      }
      endRecovery()
      navigate("/app/new", { replace: true })
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Choose a new password" subtitle={`For ${user.email}. You'll stay signed in afterwards.`}>
      <form onSubmit={handleSubmit} className="auth-form" noValidate>
        <div>
          <label className="field-label" htmlFor="r-pass">New password</label>
          <input id="r-pass" className="input" type="password" value={password} autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)} required minLength={MIN_LENGTH} />
          <p className="field-hint">At least {MIN_LENGTH} characters.</p>
        </div>
        <div>
          <label className="field-label" htmlFor="r-confirm">Confirm new password</label>
          <input id="r-confirm" className="input" type="password" value={confirm} autoComplete="new-password"
            onChange={(e) => setConfirm(e.target.value)} required />
        </div>
        {error && <div className="alert" data-tone="fail" role="alert"><Alert size={16} />{error}</div>}
        <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
          <span>{loading ? "Saving…" : "Save new password"}</span>
          <ArrowRight size={18} className="nudge" />
        </button>
      </form>
    </AuthLayout>
  )
}
