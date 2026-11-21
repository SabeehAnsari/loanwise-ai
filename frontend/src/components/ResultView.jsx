import { Verdict, Factors, RulesTable } from "./DecisionCard"
import BiasReport from "./BiasReport"
import { EmailPreview, Products } from "./EmailPreview"
import { Alert, Retry } from "./Icons"

export default function ResultView({ result, showLink = false }) {
  const rejected = result.status === "REJECTED_BY_RULES"
  return (
    <div className="sheet result-sheet land" key={result.application_id || result._at}>
      <Verdict result={result} showLink={showLink} />
      {rejected && <RulesTable message={result.message} />}
      {!rejected && <Factors explanation={result.explanation} stored={result._stored} />}
      <BiasReport bias={result.bias_report} />
      <EmailPreview email={result.email} />
      <Products marketing={result.marketing} />
    </div>
  )
}

export function ResultSkeleton({ label = "Running the decision pipeline" }) {
  return (
    <div className="sheet result-sheet" aria-busy="true" aria-label={label}>
      <section className="block">
        <div className="skel" style={{ height: 14, width: 180 }} />
        <div className="skel" style={{ height: 88, width: "min(440px, 80%)", marginTop: 20, borderRadius: 12 }} />
        <div className="skel" style={{ height: 6, marginTop: 26 }} />
        <div className="skel" style={{ height: 14, width: "min(520px, 90%)", marginTop: 24 }} />
      </section>
      <section className="block">
        <div className="panel-head"><span className="panel-title">What moved this decision</span></div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "13px 0", borderTop: "1px solid var(--line)" }}>
            <div className="skel" style={{ height: 12, width: 150 }} />
            <div className="skel" style={{ height: 12, flex: 1 }} />
          </div>
        ))}
        <p className="caption">Scoring, then writing and checking the letter. This usually takes a few seconds.</p>
      </section>
    </div>
  )
}

export function ErrorPanel({ title, message, onRetry }) {
  return (
    <section className="sheet panel" role="alert">
      <div className="notice">
        <Alert size={18} />
        <div>
          <b>{title}</b>
          {message}
          {onRetry && (
            <div style={{ marginTop: 14 }}>
              <button type="button" className="btn btn-glass" onClick={onRetry}><Retry size={15} />Try again</button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
