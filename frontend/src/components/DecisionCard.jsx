import { Link } from "react-router"
import { verdictOf } from "../pipeline"
import { formatWhen } from "../lib/records"
import { ArrowLeft, ArrowRight } from "./Icons"

const money = (n) => "$" + Math.round(n).toLocaleString("en-US")

export function Verdict({ result, showLink = false }) {
  const v = verdictOf(result)
  const hasProb = typeof result.probability === "number"
  const pct = hasProb ? result.probability * 100 : null
  const cut = typeof result.threshold === "number" ? result.threshold * 100 : null
  const fill = v.tone === "pass" ? "var(--pass)" : v.tone === "fail" ? "var(--fail)" : "var(--warn)"
  const version = result.model_version || result.bias_report?.model_version
  const d = result.derived

  let fallback = null
  if (!result.message && result.decision === "APPROVED") {
    fallback = "Passed the business rules and cleared the auto-approve threshold. The deployed model is cleared by its fairness gate."
  }

  return (
    <section className="block" aria-labelledby="verdict-word">
      <div className="masthead">
        <b>{result._applicant || "Application"}</b>
        <span>
          {formatWhen(result._at)}
          {version ? ` · ${version}` : ""}
          {showLink && result.application_id && (
            <> · <Link to={`/app/decisions/${result.application_id}`}>Open as page</Link></>
          )}
        </span>
      </div>
      <div className="verdict-line">
        <h2 id="verdict-word" className="verdict-word" data-tone={v.tone}>{v.word}</h2>
        {hasProb && (
          <p className="verdict-prob"><b>{pct.toFixed(1)}%</b><span>approval probability</span></p>
        )}
      </div>
      {hasProb && cut != null && (
        <div className="prob-scale" role="img"
          aria-label={`Approval probability ${pct.toFixed(1)} percent against an auto-approve threshold of ${cut.toFixed(0)} percent`}>
          <span className="track" />
          <span className="fill" style={{ width: `${pct}%`, background: fill }} />
          <span className="cut" style={{ left: `${cut}%` }} />
          <span className="cut-label" style={{ left: `${cut}%`, transform: cut > 80 ? "translateX(-100%)" : undefined }}>auto-approve at {cut.toFixed(0)}%</span>
        </div>
      )}
      {(result.message || fallback) && <p className="verdict-msg">{result.message || fallback}</p>}
      {result.decision === "REFERRED" && (
        <p className="caption" style={{ marginTop: 8 }}>
          The model never denies an application. Below the threshold, a loan officer makes the decision.
        </p>
      )}
      {d && (
        <dl className="derived">
          <div><dt>Est. debt-to-income</dt><dd>{Number(d.dti).toFixed(1)}%</dd></div>
          <div><dt>Loan-to-value</dt><dd>{Number(d.ltv).toFixed(1)}%</dd></div>
          <div><dt>Est. payment</dt><dd>{money(d.monthly_payment)}/mo</dd></div>
          <div><dt>Loan limit</dt><dd>{d.conforming ? "Conforming" : "Jumbo"}</dd></div>
        </dl>
      )}
    </section>
  )
}

const RULES = [
  { key: "income", label: "Household income", limit: "at least $10,000 a year", match: "minimum household income" },
  { key: "positive", label: "Loan amount", limit: "greater than zero", match: "greater than zero" },
  { key: "ltv", label: "Loan-to-value", limit: "at most 100% of the property value", match: "loan-to-value" },
  { key: "dti", label: "Estimated debt-to-income", limit: "at most 60%", match: "debt-to-income" },
]

// Which business rule stopped the application, and what never ran.
export function RulesTable({ message }) {
  const msg = (message || "").toLowerCase()
  const failed = RULES.findIndex((r) => msg.includes(r.match))
  return (
    <section className="block" aria-labelledby="rules-h">
      <div className="panel-head">
        <h3 id="rules-h" className="panel-title">Business rules</h3>
        <span className="panel-meta">Checked in order, before the model</span>
      </div>
      <table className="table">
        <thead><tr><th scope="col">Rule</th><th scope="col">Requirement</th><th scope="col" className="num">Result</th></tr></thead>
        <tbody>
          {RULES.map((r, i) => {
            const state = failed === -1 ? "—" : i < failed ? "Passed" : i === failed ? "Failed" : "Not checked"
            const tone = state === "Passed" ? "pass" : state === "Failed" ? "fail" : "skip"
            return (
              <tr key={r.key}>
                <td>{r.label}</td>
                <td style={{ color: "var(--muted)" }}>{r.limit}</td>
                <td className="num"><span className="status" data-tone={tone}>{state}</span></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <p className="caption">
        Clearly ineligible applications stop here. The model never scored this one, so there are no factors,
        no fairness check and no letter.
      </p>
    </section>
  )
}

export function Factors({ explanation, stored }) {
  if (explanation === null && stored) {
    return (
      <section className="block">
        <div className="panel-head"><h3 className="panel-title">What moved this decision</h3></div>
        <p className="caption" style={{ marginTop: 0, fontSize: 14 }}>
          The SHAP factors weren&rsquo;t stored for this run. Runs made after the factors column was added keep them.
        </p>
      </section>
    )
  }
  if (!explanation?.length) return null
  const max = Math.max(...explanation.map((f) => Math.abs(f.impact)), 1e-6)

  return (
    <section className="block" aria-labelledby="factors-h">
      <div className="panel-head">
        <h3 id="factors-h" className="panel-title">What moved this decision</h3>
        <span className="panel-meta">Top {explanation.length} factors · SHAP</span>
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
        <div><span className="legend-dir"><ArrowLeft size={13} />hurts</span><span className="legend-dir">helps<ArrowRight size={13} /></span></div>
        <span />
      </div>
      <p className="caption">TreeSHAP contributions in log-odds for this applicant. Bars are scaled to the largest factor.</p>
    </section>
  )
}
