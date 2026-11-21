import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { Link, NavLink, Outlet, useLocation } from "react-router"
import { STAGES, stageResults } from "../pipeline"
import { useAuth } from "../lib/auth"
import { displayName } from "../lib/user"
import { Brand, Chart, History, Plus, SignOut } from "./Icons"

const PipelineContext = createContext({ pipeline: { result: null, loading: false }, setPipeline: () => {} })
// eslint-disable-next-line react-refresh/only-export-components
export const usePipeline = () => useContext(PipelineContext)

// While the single /predict request runs, a light walks down the stages in the
// order they execute, then holds on the email stage (the slow LLM step).
function useRunningStep(loading) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!loading) return
    const id = setInterval(() => setStep((s) => Math.min(s + 1, 3)), 900)
    return () => { clearInterval(id); setStep(0) }
  }, [loading])
  return loading ? step : -1
}

function Pipeline({ result, loading, label }) {
  const results = stageResults(result)
  const running = useRunningStep(loading)
  return (
    <div>
      <div className="side-label"><span>Pipeline</span><span>{loading ? "Running" : label}</span></div>
      <ol className="pipe" aria-live="polite" aria-label="Decision pipeline">
        {STAGES.map((s, i) => {
          const r = results[s.id]
          const isRunning = running === i
          const value = isRunning ? "Running" : loading ? "" : r?.value ?? ""
          return (
            <li key={s.id} className="stage"
              data-tone={loading ? undefined : r?.tone}
              data-lit={isRunning || (!loading && results.focus === s.id)}
              data-running={isRunning}>
              <span className="stage-no">{i + 1}</span>
              <span><span className="long">{s.name}</span><span className="short">{s.short}</span></span>
              <span className="stage-val">{value}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const NAV = [
  { to: "/app/new", label: "New decision", icon: <Plus size={17} /> },
  { to: "/app/history", label: "History", icon: <History size={17} /> },
  { to: "/app/model", label: "Model & fairness", icon: <Chart size={17} /> },
]

export default function AppShell() {
  const { user, signOut } = useAuth()
  const [pipeline, setPipeline] = useState({ result: null, loading: false })
  const location = useLocation()
  const ctx = useMemo(() => ({ pipeline, setPipeline }), [pipeline])

  // Pages that don't publish a decision show an idle pipeline.
  const showsDecision = /^\/app\/(new|decisions\/)/.test(location.pathname)
  const shown = showsDecision ? pipeline : { result: null, loading: false }
  const name = displayName(user)

  return (
    <PipelineContext.Provider value={ctx}>
      <div className="app">
        <aside className="side">
          <div className="side-inner glass">
            <div className="side-top">
              <Brand as={Link} to="/" />
              <nav className="nav" aria-label="App">
                {NAV.map(({ to, label, icon }) => (
                  <NavLink key={to} to={to} title={label}>{icon}<span>{label}</span></NavLink>
                ))}
              </nav>
              <button type="button" className="icon-btn account-compact" onClick={signOut} title="Sign out" aria-label="Sign out">
                <SignOut size={17} />
              </button>
            </div>
            <Pipeline result={shown.result} loading={shown.loading} label={shown.result ? "This decision" : "Runs in order"} />
            <div className="side-foot">
              <p className="side-note">Educational project on a public 614-row dataset. Not for real lending decisions.</p>
              <div className="account">
                <span className="avatar" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
                <div className="account-text">
                  <div className="account-name">{name}</div>
                  <div className="account-mail">{user?.email}</div>
                </div>
                <button type="button" className="icon-btn" onClick={signOut} title="Sign out" aria-label="Sign out">
                  <SignOut size={17} />
                </button>
              </div>
            </div>
          </div>
        </aside>
        <main className="main">
          <Outlet />
        </main>
      </div>
    </PipelineContext.Provider>
  )
}
