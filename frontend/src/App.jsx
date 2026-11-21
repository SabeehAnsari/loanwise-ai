import { useEffect, useRef, useState } from "react"
import { supabase } from "./supabaseClient"
import Login from "./components/Login"
import LoanForm from "./components/LoanForm"
import PipelineRail from "./components/PipelineRail"
import ResultPanel from "./components/ResultPanel"
import { API_URL, useModelReport } from "./useModelReport"

function errorMessage(status) {
  if (status === 401) return "Your session has expired. Sign out, sign back in, and run it again."
  if (status === 422) return "The API rejected some fields as out of range. Check the highlighted values and try again."
  if (status === 429) return "That's more than 10 applications in a minute. Wait a moment, then try again."
  if (status >= 500) return "The server hit an error while processing the application. Try again in a moment."
  return `The request failed (HTTP ${status}).`
}

export default function App() {
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const lastForm = useRef(null)
  const runId = useRef(0)
  const { report } = useModelReport()

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

  const run = async (formData) => {
    lastForm.current = formData
    setLoading(true)
    setError(null)
    setResult(null)

    // On a single-column layout the results sit below the form; bring them into view.
    if (window.matchMedia("(max-width: 899px)").matches) {
      requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const response = await fetch(`${API_URL}/predict`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify(formData),
      })
      if (!response.ok) {
        setError(errorMessage(response.status))
        return
      }
      const data = await response.json()
      runId.current += 1
      setResult({ ...data, _runId: runId.current, _applicant: formData.name, _at: Date.now() })
    } catch {
      setError("Couldn't reach the API. Make sure the backend is running on " + API_URL + ".")
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return <div className="boot" aria-label="Loading"><div className="boot-bar" /></div>
  }

  if (!user) return <Login onLogin={setUser} report={report} />

  return (
    <div className="shell">
      <PipelineRail user={user} onSignOut={handleLogout} result={result} loading={loading} />
      <main className="workspace">
        <div className="form-col">
          <LoanForm onSubmit={run} loading={loading} />
          <p className="caption disclaimer-inline" style={{ marginTop: 28 }}>
            Educational project on a public 614-row dataset. Not for real lending decisions.
          </p>
        </div>
        <ResultPanel
          result={result}
          loading={loading}
          error={error}
          report={report}
          applicant={result?._applicant}
          onRetry={() => lastForm.current && run(lastForm.current)}
        />
      </main>
    </div>
  )
}
