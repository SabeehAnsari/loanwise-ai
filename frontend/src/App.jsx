import { useState, useEffect } from "react"
import { supabase } from "./supabaseClient"
import Login from "./components/Login"
import LoanForm from "./components/LoanForm"
import DecisionCard from "./components/DecisionCard"
import BiasReport from "./components/BiasReport"
import EmailPreview from "./components/EmailPreview"

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    )
    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setResult(null)
    setError(null)
  }

  const handleSubmit = async (formData) => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`
        },
        body: JSON.stringify(formData)
      })
      if (!response.ok) throw new Error("API request failed")
      const data = await response.json()
      setResult(data)
    } catch {
      setError("Failed to connect to the API. Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--bg)" }}>
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
      </div>
    )
  }

  if (!user) return <Login onLogin={setUser} />

  const userName = user.user_metadata?.full_name || user.email.split("@")[0]

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>

      {/* Header */}
      <header style={{
        background: "var(--surface)",
        borderBottom: "1px solid var(--border)",
        boxShadow: "var(--shadow-sm)"
      }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--navy)" }}>
              <span className="text-white text-xs font-bold">LW</span>
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: "var(--navy)", fontFamily: "'Playfair Display', serif" }}>
                LoanWise AI
              </h1>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Intelligent Loan Approval System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Pipeline steps */}
            <div className="hidden md:flex items-center gap-2">
              {["ML Model", "Bias Check", "Email Agent", "Marketing"].map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded-md font-medium"
                    style={{ background: "var(--accent-light)", color: "var(--accent)" }}>
                    {step}
                  </span>
                  {i < 3 && <span style={{ color: "var(--border)", fontSize: 12 }}>→</span>}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-3 pl-4"
              style={{ borderLeft: "1px solid var(--border)" }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "var(--navy)" }}>
                {userName.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium hidden sm:block"
                style={{ color: "var(--text-secondary)" }}>
                {userName}
              </span>
              <button onClick={handleLogout}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                style={{ background: "var(--bg)", color: "var(--text-secondary)", border: "1px solid var(--border)" }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

          {/* Left Column — Form */}
          <div>
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1" style={{ color: "var(--navy)" }}>
                New Loan Application
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Complete all fields to run the AI approval pipeline
              </p>
            </div>
            <LoanForm onSubmit={handleSubmit} loading={loading} />
          </div>

          {/* Right Column — Results */}
          <div>
            {!result && !loading && !error && (
              <div className="card p-8 text-center" style={{ marginTop: 52 }}>
                <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center"
                  style={{ background: "var(--accent-light)" }}>
                  <span style={{ fontSize: 28 }}>🏦</span>
                </div>
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--navy)" }}>
                  Ready to Process
                </h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                  Fill out the application form and submit to run the complete AI pipeline — model prediction, bias detection, email generation, and marketing recommendations.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {[
                    { label: "ML Model", desc: "XGBoost classifier" },
                    { label: "Bias Check", desc: "Fairness scoring" },
                    { label: "Email Agent", desc: "GPT-4o-mini generation" },
                    { label: "Marketing", desc: "Product matching" },
                  ].map((s, i) => (
                    <div key={i} className="rounded-lg p-3 text-left"
                      style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
                      <p className="text-xs font-semibold" style={{ color: "var(--navy)" }}>{s.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loading && (
              <div className="card p-8 text-center fade-in" style={{ marginTop: 52 }}>
                <div className="w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4"
                  style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }} />
                <h3 className="text-lg font-bold mb-2" style={{ color: "var(--navy)" }}>
                  Processing Application
                </h3>
                <div className="space-y-2 mt-4">
                  {["Running ML model...", "Checking for bias...", "Generating email...", "Matching products..."].map((s, i) => (
                    <p key={i} className="text-sm" style={{ color: "var(--text-muted)", animationDelay: `${i * 0.5}s` }}>
                      {s}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="card card-accent-red p-6 fade-in" style={{ marginTop: 52 }}>
                <p className="font-semibold mb-1" style={{ color: "var(--danger)" }}>Connection Error</p>
                <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{error}</p>
              </div>
            )}

            {result && !loading && (
              <div className="space-y-5 slide-up">
                <DecisionCard result={result} />
                <BiasReport bias={result.bias_report} />
                <EmailPreview email={result.email} />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}