import { useState } from "react"
import { Link, useLocation, useNavigate, useSearchParams } from "react-router"
import { supabase } from "../supabaseClient"
import { Alert, ArrowLeft, ArrowRight, Brand, Check } from "../components/Icons"

export default function AuthPage({ mode }) {
  const signup = mode === "signup"
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(location.state?.message || null)

  // Where to go once signed in: back to the page that asked, or a first run.
  const sample = params.get("sample")
  const next = location.state?.from || (sample ? `/app/new?sample=${encodeURIComponent(sample)}` : "/app/new")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) setError(error.message)
        else if (data.session) navigate(next, { replace: true })
        else navigate(`/signin${sample ? `?sample=${encodeURIComponent(sample)}` : ""}`, {
          replace: true,
          state: { message: "Account created. Confirm your email if asked, then sign in." },
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        else navigate(next, { replace: true })
      }
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const other = signup ? "/signin" : "/signup"
  const keep = sample ? `?sample=${encodeURIComponent(sample)}` : ""

  return (
    <div className="auth">
      <div className="auth-top">
        <Brand as={Link} to="/" />
        <Link to="/" className="btn btn-quiet"><ArrowLeft size={15} />Back to site</Link>
      </div>
      <div className="auth-body">
        <div className="sheet auth-card">
          <h1>{signup ? "Create a demo account" : "Sign in"}</h1>
          <p className="page-sub">
            {signup ? "Free, for trying the pipeline. Decision letters are sent to this address." : "Run decisions and review your history."}
          </p>

          <form onSubmit={handleSubmit} className="auth-form">
            {signup && (
              <div>
                <label className="field-label" htmlFor="a-name">Name</label>
                <input id="a-name" className="input" type="text" value={name} autoComplete="name"
                  onChange={(e) => setName(e.target.value)} placeholder="Alex Kim" required />
              </div>
            )}
            <div>
              <label className="field-label" htmlFor="a-email">Email</label>
              <input id="a-email" className="input" type="email" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
            </div>
            <div>
              <label className="field-label" htmlFor="a-pass">Password</label>
              <input id="a-pass" className="input" type="password" value={password} minLength={6}
                autoComplete={signup ? "new-password" : "current-password"}
                onChange={(e) => setPassword(e.target.value)} required />
              {signup
                ? <p className="field-hint">At least 6 characters.</p>
                : <p className="field-hint"><Link className="link" to="/forgot-password">Forgot password?</Link></p>}
            </div>

            {error && <div className="alert" data-tone="fail" role="alert"><Alert size={16} />{error}</div>}
            {message && <div className="alert" data-tone="pass" role="status"><Check size={16} />{message}</div>}

            <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block">
              <span>{loading ? "One moment…" : signup ? "Create account" : "Sign in"}</span>
              <ArrowRight size={18} className="nudge" />
            </button>
          </form>

          <p className="auth-switch">
            {signup ? "Already have an account? " : "New here? "}
            <Link className="link" to={`${other}${keep}`}>{signup ? "Sign in" : "Create a demo account"}</Link>
          </p>
        </div>
      </div>
      <p className="auth-foot">Educational project. Not for real lending decisions.</p>
    </div>
  )
}
