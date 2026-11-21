import { useEffect, useState } from "react"
import { STAGES, stageResults } from "../pipeline"
import { BrandMark, SignOut } from "./Icons"

function Account({ user, onSignOut }) {
  const name = user.user_metadata?.full_name || user.email.split("@")[0]
  return (
    <div className="account">
      <div className="account-text" style={{ minWidth: 0 }}>
        <div className="account-name">{name}</div>
        <div className="account-mail">{user.email}</div>
      </div>
      <button type="button" className="btn-rail" onClick={onSignOut}>
        <SignOut size={15} /> Sign out
      </button>
    </div>
  )
}

// The server runs the pipeline in one request, so while waiting the rail walks a
// pointer down the stages to show the order they run in; real values replace it.
function useRunningPointer(loading) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!loading) return
    // Hold on the email stage: the LLM letter is the slow step.
    const id = setInterval(() => setStep((s) => Math.min(s + 1, 3)), 900)
    return () => { clearInterval(id); setStep(0) }
  }, [loading])
  return loading ? step : -1
}

export default function PipelineRail({ user, onSignOut, result, loading }) {
  const results = stageResults(result)
  const running = useRunningPointer(loading)

  return (
    <aside className="rail" aria-label="Decision pipeline">
      <div className="rail-top">
        <div className="brand">
          <BrandMark className="brand-mark" />
          <div>
            <div className="brand-name">LoanWise AI</div>
            <div className="brand-tag">Explained, audited loan decisions</div>
          </div>
        </div>
        <Account user={user} onSignOut={onSignOut} />
      </div>

      <div>
        <h2 className="rail-heading">Pipeline <span>{result ? "Last run" : "Runs in order"}</span></h2>
        <ol className="pipeline" aria-live="polite">
          {STAGES.map((s, i) => {
            const r = results[s.id]
            const isRunning = running === i
            const value = isRunning ? "Running" : loading ? "—" : r?.value ?? "—"
            return (
              <li key={s.id} className="stage"
                data-tone={loading ? undefined : r?.tone}
                data-focus={!loading && results.focus === s.id}
                data-running={isRunning}>
                <span className="stage-no">{String(i + 1).padStart(2, "0")}</span>
                <span className="stage-name">
                  {s.name}
                  <span className="stage-desc">{s.desc}</span>
                </span>
                <span className="stage-val">{value}</span>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="rail-foot">
        <p>Educational project on a public 614-row dataset. Not for real lending decisions.</p>
        <Account user={user} onSignOut={onSignOut} />
      </div>
    </aside>
  )
}
