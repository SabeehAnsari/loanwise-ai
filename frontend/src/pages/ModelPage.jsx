import BiasReport from "../components/BiasReport"
import { MAJORITY_BASELINE, useModelReport } from "../useModelReport"
import { auditToBias } from "../lib/records"

const f3 = (v) => (v != null ? v.toFixed(3) : "—")

const FEATURE_NAMES = {
  Dependents: "Dependents", Education: "Education", Self_Employed: "Self-employed",
  Loan_Amount_Term: "Loan term", Credit_History: "Credit history", Property_Area: "Property area",
  Income_to_Loan_Ratio: "Income-to-loan ratio", Total_Income_Log: "Total income (log)",
  LoanAmount_Log: "Loan amount (log)", Gender: "Gender", Married: "Marital status",
}

const RULES = [
  ["Combined monthly income", "at least $500"],
  ["Loan amount", "greater than zero"],
  ["Loan amount cap", "at most $10,000,000"],
  ["Repayment-to-income", "at most 60%, before interest"],
]

export default function ModelPage() {
  const { report, live } = useModelReport()
  if (!report) {
    return <div className="block" aria-busy="true"><div className="skel" style={{ height: 120 }} /></div>
  }
  const ev = report.evaluation
  const m = ev.metrics
  const base = ev.credit_history_rule_baseline
  const rows = [
    { name: "Majority class (approve everyone)", ...MAJORITY_BASELINE },
    { name: "Approve if credit history is clean", ...base },
    { name: "LoanWise XGBoost (deployed)", accuracy: m.accuracy.mean, balanced_accuracy: m.balanced_accuracy.mean, f1: m.f1.mean, roc_auc: m.roc_auc.mean, us: true },
  ]

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Model &amp; fairness</h1>
          <p className="page-sub">
            {report.model} · version {report.model_version}
            {!live && " · showing the published card (API offline)"}
          </p>
        </div>
      </div>

      <div className="ground-blocks">
        <section className="block" aria-labelledby="cmp-h">
          <div className="panel-head">
            <h2 id="cmp-h" className="panel-title">Against the simplest rules</h2>
            <span className="panel-meta">{ev.protocol}</span>
          </div>
          <table className="table">
            <thead>
              <tr><th scope="col">Model</th><th scope="col" className="num">Accuracy</th><th scope="col" className="num">Balanced acc.</th><th scope="col" className="num">F1</th><th scope="col" className="num">ROC-AUC</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className={r.us ? "em" : ""}>
                  <td>{r.name}</td>
                  <td className="num">{f3(r.accuracy)}{r.us && <span style={{ color: "var(--muted)", fontWeight: 400 }}> ± {f3(m.accuracy.std)}</span>}</td>
                  <td className="num">{f3(r.balanced_accuracy)}</td>
                  <td className="num">{f3(r.f1)}</td>
                  <td className="num">{f3(r.roc_auc)}{r.us && <span style={{ color: "var(--muted)", fontWeight: 400 }}> ± {f3(m.roc_auc.std)}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="caption">
            On {report.training_rows} labelled applications, the model barely beats a one-line credit-history rule on
            accuracy. Its value is ranking: it separates risk within the good-credit group, which a binary rule cannot.
            Choosing the best of seven candidates on the same CV makes these figures slightly optimistic.
          </p>
        </section>

        <div className="model-grid">
          <section className="block" aria-labelledby="in-h">
            <div className="panel-head"><h2 id="in-h" className="panel-title">What the model sees</h2><span className="panel-meta">{report.features.length} features</span></div>
            <div className="tags">{report.features.map((f) => <span key={f} className="tag">{FEATURE_NAMES[f] || f}</span>)}</div>
            <div className="panel-head" style={{ marginTop: 20 }}><h3 className="panel-title">Never an input</h3></div>
            <div className="tags">{report.excluded_features.map((f) => <span key={f} className="tag off">{FEATURE_NAMES[f] || f}</span>)}</div>
            <p className="caption">Removing gender and marital status cost no accuracy, and a test proves flipping them cannot change a score. They are still collected, only to audit outcomes.</p>
          </section>

          <section className="block" aria-labelledby="rules-h">
            <div className="panel-head"><h2 id="rules-h" className="panel-title">Business rules</h2><span className="panel-meta">Run before the model</span></div>
            <table className="table">
              <tbody>
                {RULES.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num" style={{ color: "var(--muted)" }}>{v}</td></tr>)}
              </tbody>
            </table>
            <p className="caption">An application that fails any rule is denied without reaching the model, and is still saved.</p>
          </section>
        </div>

        <BiasReport bias={auditToBias(report.fairness_audit, report.model_version)} title="Fairness audit of the deployed model" />

        <section className="block" aria-labelledby="lim-h">
          <div className="panel-head"><h2 id="lim-h" className="panel-title">Limits worth knowing</h2></div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14.5, color: "var(--ink-2)", maxWidth: "74ch" }}>
            <li>Trained on about 600 public records from an unknown population; never validated on real applicants.</li>
            <li>Excluding protected attributes is not enough on its own: correlated features can carry their effect, which is why outcomes are audited.</li>
            <li>With only {report.fairness_audit.group_sizes?.female ?? 112} female applicants, the fairness confidence intervals are wide.</li>
            <li>SHAP describes the model&rsquo;s reasoning, not causal effects. The repayment rule ignores interest.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
