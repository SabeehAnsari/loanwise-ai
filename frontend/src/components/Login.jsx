import { useState } from "react"
import { supabase } from "../supabaseClient"

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: name } }
      })
      if (error) setError(error.message)
      else { setMessage("Account created! You can now sign in."); setMode("login") }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else onLogin(data.user)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12"
        style={{ background: "var(--navy)" }}>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">LoanWise AI</h1>
          <p style={{ color: "#8aafd4", fontSize: 15 }}>Intelligent Loan Approval System</p>
        </div>

        <div className="space-y-8">
          {[
            { icon: "⚡", title: "Instant Decisions", desc: "AI-powered approvals in seconds, not days" },
            { icon: "🛡️", title: "Bias Detection", desc: "Every decision checked for fairness automatically" },
            { icon: "✉️", title: "Smart Communications", desc: "Personalized emails generated and delivered instantly" },
          ].map((f, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.08)", fontSize: 18 }}>
                {f.icon}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{f.title}</p>
                <p style={{ color: "#8aafd4", fontSize: 13 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p style={{ color: "#4a6a8a", fontSize: 12 }}>
          © 2026 LoanWise AI. All rights reserved.
        </p>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <h1 className="text-2xl font-bold" style={{ color: "var(--navy)" }}>LoanWise AI</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Intelligent Loan Approval System</p>
          </div>

          <div className="card card-accent-blue p-8">
            <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>
              {mode === "login" ? "Welcome back" : "Create account"}
            </h2>
            <p className="mb-6" style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {mode === "login"
                ? "Sign in to access the loan approval system"
                : "Get started with LoanWise AI today"}
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="label">Full Name</label>
                  <input
                    className="input-field"
                    type="text" value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Smith" required
                  />
                </div>
              )}

              <div>
                <label className="label">Email Address</label>
                <input
                  className="input-field"
                  type="email" value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com" required
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  className="input-field"
                  type="password" value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" required
                />
              </div>

              {error && (
                <div className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: "var(--danger-light)", color: "var(--danger)" }}>
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-lg px-4 py-3 text-sm"
                  style={{ background: "var(--success-light)", color: "var(--success)" }}>
                  {message}
                </div>
              )}

              <button
                type="submit" disabled={loading}
                className="btn-primary w-full py-3 rounded-xl text-sm mt-2"
              >
                {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
              {mode === "login" ? (
                <>Don't have an account?{" "}
                  <button onClick={() => { setMode("signup"); setError(null) }}
                    className="font-semibold" style={{ color: "var(--accent)" }}>
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => { setMode("login"); setError(null) }}
                    className="font-semibold" style={{ color: "var(--accent)" }}>
                    Sign in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}