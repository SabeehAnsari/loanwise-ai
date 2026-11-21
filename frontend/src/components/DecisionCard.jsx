import { verdictOf } from "../pipeline"

const THRESHOLD = 0.5

export function Verdict({ result, applicant }) {
  const v = verdictOf(result)
  const hasProb = typeof result.probability === "number"
  const pct = hasProb ? result.probability * 100 : null
  const fill = v.tone === "pass" ? "var(--pass)" : v.tone === "fail" ? "var(--fail)" : "var(--warn)"
  const time = result._at ? new Date(result._at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : null
  const version = result.bias_report?.model_version

  return (
    <section className="block verdict" aria-labelledby="verdict-word">
      <div className="masthead">
        <span className="masthead-name">{applicant || "Application"}</span>
        <span className="masthead-meta">
          {result._runId ? `Run ${result._runId}` : null}
          {time ? ` · ${time}` : null}
          {version ? ` · ${version}` : null}
        </span>
      </div>
      <div className="verdict-line">
        <h2 id="verdict-word" className="verdict-word" data-tone={v.tone}>{v.word}</h2>
        {hasProb && (
          <p className="verdict-prob">
            <b>{pct.toFixed(1)}%</b>
            <span>model approval probability</span>
          </p>
        )}
      </div>
      {hasProb && (
        <div className="prob-scale" role="img"
          aria-label={`Approval probability ${pct.toFixed(1)} percent against a 50 percent cut-off`}>
          <span className="track" />
          <span className="fill" style={{ width: `${pct}%`, background: fill }} />
          <span className="cut" style={{ left: `${THRESHOLD * 100}%` }} />
          <span className="cut-label" style={{ left: `${THRESHOLD * 100}%` }}>50% cut-off</span>
        </div>
      )}
      {result.message && <p className="verdict-msg">{result.message}</p>}
      {!result.message && v.tone === "pass" && (
        <p className="verdict-msg">Passed the business rules, scored above the cut-off, and the deployed model is cleared by its fairness audit.</p>
      )}
      {!result.message && v.tone === "fail" && v.by === "model" && (
        <p className="verdict-msg">Passed the business rules but scored below the cut-off. The factors below show what pulled it down.</p>
      )}
    </section>
  )
}

const RULES = [
  { key: "income", label: "Combined monthly income", limit: "at least $500", match: "minimum combined monthly income" },
  { key: "positive", label: "Loan amount", limit: "greater than zero", match: "greater than zero" },
  { key: "cap", label: "Loan amount cap", limit: "at most $10,000,000", match: "maximum loan" },
  { key: "dti", label: "Repayment-to-income (before interest)", limit: "at most 60%", match: "debt-to-income" },
]

// Shown when stage 01 stopped the application: which rule failed, and what never ran.
export function RulesTable({ message }) {
  const msg = (message || "").toLowerCase()
  const failed = RULES.findIndex((r) => msg.includes(r.match))
  return (
    <section className="block" aria-labelledby="rules-h">
      <div className="block-head">
        <h3 id="rules-h" className="block-title"><span className="fig">Table 1</span>Business rules</h3>
        <span className="block-meta">Checked in order before the model</span>
      </div>
      <table className="table">
        <thead>
          <tr><th scope="col">Rule</th><th scope="col">Requirement</th><th scope="col" className="num">Result</th></tr>
        </thead>
        <tbody>
          {RULES.map((r, i) => {
            const state = failed === -1 ? "—" : i < failed ? "Passed" : i === failed ? "Failed" : "Not checked"
            const color = state === "Passed" ? "var(--pass)" : state === "Failed" ? "var(--fail)" : "var(--muted)"
            return (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td style={{ color: "var(--muted)" }}>{r.limit}</td>
                <td className="num" style={{ color, fontWeight: state === "Failed" ? 600 : 400 }}>{state}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="caption">
        Clearly ineligible applications stop here. The model never scored this one, so there are no factors,
        no fairness check and no letter. The application is still stored.
      </p>
    </section>
  )
}

export function Factors({ explanation }) {
  if (!explanation?.length) return null
  const max = Math.max(...explanation.map((f) => Math.abs(f.impact)), 1e-6)

  return (
    <section className="block" aria-labelledby="fig1">
      <div className="block-head">
        <h3 id="fig1" className="block-title"><span className="fig">Fig. 1</span>What moved this decision</h3>
        <span className="block-meta">Top {explanation.length} factors</span>
      </div>
      <ul className="shap">
        {explanation.map((f) => {
          const pos = f.direction === "positive"
          const w = (Math.abs(f.impact) / max) * 50
          return (
            <li key={f.feature} className="shap-row">
              <span>{f.label}</span>
              <span className="shap-axis" aria-hidden="true">
                <span className={`shap-bar ${pos ? "pos" : "neg"}`} style={{ width: `${w}%` }} />
              </span>
              <span className={`shap-val ${pos ? "pos" : "neg"}`}>
                <span className="sr-only">{pos ? "helps approval" : "hurts approval"}, </span>
                {pos ? "+" : "−"}{Math.abs(f.impact).toFixed(2)}
              </span>
            </li>
          )
        })}
      </ul>
      <div className="shap-legend" aria-hidden="true">
        <span />
        <div><span>← hurts approval</span><span>helps approval →</span></div>
        <span />
      </div>
      <p className="caption">
        TreeSHAP contributions in log-odds for this applicant, computed by XGBoost. Bars are scaled to the largest factor.
      </p>
    </section>
  )
}
