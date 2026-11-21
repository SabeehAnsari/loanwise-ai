import { Verdict, Factors, RulesTable } from "./DecisionCard"
import BiasReport from "./BiasReport"
import { EmailPreview, Products } from "./EmailPreview"
import { Alert, Retry } from "./Icons"

const f3 = (v) => (v != null ? v.toFixed(3) : "—")

function ModelCard({ report }) {
  const ev = report?.evaluation
  const m = ev?.metrics
  const base = ev?.credit_history_rule_baseline
  const audit = report?.fairness_audit

  return (
    <div>
      <section className="block">
        <h2 className="intro-title">Every decision arrives with its reasons and its audit.</h2>
        <p className="intro-body">
          Fill in the application, or load a sample, and run it. Business rules screen it first, then
          an XGBoost model scores it and SHAP explains the score. The fairness gate and LLM guardrails
          decide whether the result can go out automatically.
        </p>
      </section>

      <section className="block" aria-labelledby="mc-h">
        <div className="block-head">
          <h3 id="mc-h" className="block-title">Model card</h3>
          <span className="block-meta">{report?.model_version ?? "Deployed model"}</span>
        </div>
        {m ? (
          <>
            <div className="metric-grid">
              <div className="metric"><b>{f3(m.accuracy.mean)}</b><span>Accuracy</span><small>± {f3(m.accuracy.std)}</small></div>
              <div className="metric"><b>{f3(m.balanced_accuracy.mean)}</b><span>Balanced accuracy</span><small>baseline {f3(base?.balanced_accuracy)}</small></div>
              <div className="metric"><b>{f3(m.roc_auc.mean)}</b><span>ROC-AUC</span><small>baseline {f3(base?.roc_auc)}</small></div>
              <div className="metric"><b>{f3(audit?.bias_score)}</b><span>Bias score</span><small>limit {audit?.threshold?.toFixed(2)}</small></div>
            </div>
            <p className="caption">
              {ev.protocol} on {report.training_rows} labelled applications. The baseline approves exactly
              the applicants with a clean credit history. Excluded from the model: {report.excluded_features?.join(" and ").toLowerCase()}.
            </p>
          </>
        ) : (
          <p className="caption" style={{ fontSize: 14.5 }}>
            The model card loads from the API&rsquo;s public <code>/model</code> endpoint. Start the backend to see
            cross-validated accuracy, the credit-history baseline and the fairness audit here.
          </p>
        )}
      </section>
    </div>
  )
}

function Loading() {
  return (
    <div aria-busy="true" aria-label="Running the decision pipeline">
      <section className="block">
        <div className="skel" style={{ height: 14, width: 180 }} />
        <div className="skel" style={{ height: 92, width: "min(460px, 80%)", marginTop: 16 }} />
        <div className="skel" style={{ height: 6, width: "min(620px, 100%)", marginTop: 26 }} />
        <div className="skel" style={{ height: 14, width: "min(520px, 90%)", marginTop: 24 }} />
      </section>
      <section className="block">
        <div className="block-head"><span className="block-title"><span className="fig">Fig. 1</span>What moved this decision</span></div>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ display: "flex", gap: 16, padding: "13px 0", borderBottom: "1px solid var(--hair)" }}>
            <div className="skel" style={{ height: 12, width: 150 }} />
            <div className="skel" style={{ height: 12, flex: 1 }} />
          </div>
        ))}
        <p className="caption">Scoring, then writing and checking the letter. This usually takes a few seconds.</p>
      </section>
    </div>
  )
}

export default function ResultPanel({ result, loading, error, onRetry, applicant, report }) {
  return (
    <section className="result-col" aria-live="polite" id="results" tabIndex={-1}>
      <div className="result-inner">
        {loading && <Loading />}

        {!loading && error && (
          <div className="block">
            <div className="notice" role="alert">
              <Alert size={18} />
              <div>
                <b>The application didn&rsquo;t go through</b>
                {error}
                <div style={{ marginTop: 14 }}>
                  <button type="button" className="btn-secondary" onClick={onRetry}><Retry size={15} />Try again</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && result && (
          <div className="publish" key={result._runId}>
            <Verdict result={result} applicant={applicant} />
            {result.status === "REJECTED_BY_RULES" && <RulesTable message={result.message} />}
            <Factors explanation={result.explanation} />
            <BiasReport bias={result.bias_report} />
            <EmailPreview email={result.email} />
            <Products marketing={result.marketing} />
          </div>
        )}

        {!loading && !error && !result && <ModelCard report={report} />}
      </div>
    </section>
  )
}

export { ModelCard }
