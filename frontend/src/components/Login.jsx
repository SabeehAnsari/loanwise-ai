import { useState } from "react"
import { supabase } from "../supabaseClient"
import { Alert, ArrowRight, BrandMark, Check } from "./Icons"

const f3 = (v) => (v != null ? v.toFixed(3) : null)

export default function Login({ onLogin, report }) {
  const [mode, setMode] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const signup = mode === "signup"

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      if (signup) {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: name } } })
        if (error) setError(error.message)
        else { setMessage("Account created. Sign in with the same email and password."); setMode("login") }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        else onLogin(data.user)
      }
    } catch {
      setError("Couldn't reach the sign-in service. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (next) => { setMode(next); setError(null); setMessage(null) }

  const m = report?.evaluation?.metrics
  const figures = [
    { value: report?.training_rows ?? 614, label: "labelled applications" },
    { value: m ? f3(m.accuracy.mean) : null, label: "cross-validated accuracy" },
    { value: f3(report?.fairness_audit?.bias_score), label: `bias score, limit ${report?.fairness_audit?.threshold ?? 0.2}` },
  ].filter((f) => f.value != null)

  return (
    <div className="auth">
      <aside className="auth-panel">
        <div className="brand">
          <BrandMark className="brand-mark" />
          <div>
            <div className="brand-name">LoanWise AI</div>
            <div className="brand-tag">Explained, audited loan decisions</div>
          </div>
        </div>

        <div className="auth-copy">
          <h1 className="auth-statement">Loan decisions that show their working.</h1>
          <p className="auth-lede">
            Business rules, an XGBoost score explained with SHAP, a fairness gate that can switch automation off,
            and an LLM letter that must pass guardrails before it is sent.
          </p>
        </div>

        <div className="auth-figures">
          {figures.map((f) => (
            <div key={f.label}><b>{f.value}</b><span>{f.label}</span></div>
          ))}
        </div>

        <p className="auth-foot">Educational project. Not for real lending decisions.</p>
      </aside>

      <main className="auth-main">
        <div className="auth-form">
          <h2 className="page-title">{signup ? "Create an account" : "Sign in"}</h2>
          <p className="page-sub">
            {signup ? "Any email works. Decision letters are sent to it." : "Use your LoanWise AI account to run applications."}
          </p>

          <form onSubmit={handleSubmit} className="fields" style={{ marginTop: 28 }}>
            {signup && (
              <div>
                <label className="field-label" htmlFor="a-name">Full name</label>
                <input id="a-name" className="input" type="text" value={name} autoComplete="name"
                  onChange={(e) => setName(e.target.value)} required />
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
              {signup && <p className="field-hint">At least 6 characters.</p>}
            </div>

            {error && <div className="alert" data-tone="fail" role="alert"><Alert size={16} />{error}</div>}
            {message && <div className="alert" data-tone="pass" role="status"><Check size={16} />{message}</div>}

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: 8 }}>
              <span>{loading ? "One moment…" : signup ? "Create account" : "Sign in"}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          <p className="auth-switch">
            {signup ? "Already have an account? " : "New here? "}
            <button type="button" className="link-btn" onClick={() => switchMode(signup ? "login" : "signup")}>
              {signup ? "Sign in" : "Create an account"}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}
