import BiasReport from "../components/BiasReport"
import { useModelReport } from "../useModelReport"
import { cardToBias } from "../lib/records"

const f3 = (v) => (v != null ? v.toFixed(3) : "—")
const pct = (v, d = 1) => (v != null ? `${(v * 100).toFixed(d)}%` : "—")
const pts = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}`

const RULES = [
  ["Household income", "at least $10,000 a year"],
  ["Loan amount", "greater than zero"],
  ["Loan-to-value", "at most 100%"],
  ["Estimated debt-to-income", "at most 60%"],
]

export default function ModelPage() {
  const { report: card, live } = useModelReport()
  if (!card) {
    return <div className="sheet panel" aria-busy="true"><div className="skel" style={{ height: 120 }} /></div>
  }
  const m = card.metrics
  const p = card.policy
  const a = card.assumptions
  const shown = card.comparison.filter((c) => c.name !== "Majority class (approve everyone)")

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Model &amp; fairness</h1>
          <p className="page-sub">
            {card.model} · version {card.model_version}
            {!live && " · showing the published card (API offline)"}
          </p>
        </div>
      </div>

      <div className="ground-blocks">
        <section className="block" aria-labelledby="data-h">
          <div className="panel-head">
            <h2 id="data-h" className="panel-title">Trained on real lender decisions</h2>
            <span className="panel-meta">{card.data.source}</span>
          </div>
          <div className="figs" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
            <div className="fig"><b>{card.data.train.rows.toLocaleString("en-US")}</b><span>{card.data.train.state} {card.data.train.year} applications (training)</span></div>
            <div className="fig"><b>{card.data.test.rows.toLocaleString("en-US")}</b><span>{card.data.test.state} {card.data.test.year} applications (held-out test)</span></div>
            <div className="fig"><b>{f3(m.roc_auc)}</b><span>ROC-AUC on {card.data.test.year}</span></div>
            <div className="fig"><b>{f3(m.ece)}</b><span>Calibration error (ECE)</span></div>
          </div>
        </section>

        <section className="block" aria-labelledby="cmp-h">
          <div className="panel-head">
            <h2 id="cmp-h" className="panel-title">Against simpler approaches</h2>
            <span className="panel-meta">Trained on {card.data.train.year}, tested on {card.data.test.year}</span>
          </div>
          <table className="table">
            <thead>
              <tr><th scope="col">Model</th><th scope="col" className="num">ROC-AUC</th><th scope="col" className="num">PR-AUC (denials)</th></tr>
            </thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.name} className={c.name === "XGBoost (monotonic)" ? "em" : ""}>
                  <td>{c.name}{c.name === "XGBoost (monotonic)" ? " · deployed" : ""}</td>
                  <td className="num">{f3(c.roc_auc)}</td>
                  <td className="num">{f3(c.pr_auc_denial)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="caption">
            The deployed model gives up a little accuracy against the unconstrained one for a guarantee: more debt or a
            smaller deposit can never raise the approval probability.
          </p>
        </section>

        <section className="block" aria-labelledby="pol-h">
          <div className="panel-head">
            <h2 id="pol-h" className="panel-title">Decision policy</h2>
            <span className="panel-meta">Threshold chosen on {p.chosen_on}</span>
          </div>
          <p style={{ fontSize: 15, color: "var(--ink-2)", maxWidth: "70ch" }}>
            Applications scoring at least <b>{pct(p.threshold, 0)}</b> are approved automatically; everything else goes to
            a loan officer. The model never denies. The threshold allows at most {pct(p.error_budget, 0)} of automatic
            approvals to be ones a lender denied: on {card.data.test.year} it automated <b>{pct(p.test_auto_approved_share)}</b> of
            applications at <b>{pct(p.test_wrong_auto_approval)}</b> wrong, and sent {pct(p.test_denials_referred, 0)} of lender
            denials to a person.
          </p>
        </section>

        <div className="model-grid">
          <section className="block" aria-labelledby="in-h">
            <div className="panel-head"><h2 id="in-h" className="panel-title">What the model sees</h2><span className="panel-meta">{card.features.length} features</span></div>
            <div className="tags">{[...new Set(card.features.map((f) => card.feature_labels[f] || f))].map((f) => <span key={f} className="tag">{f}</span>)}</div>
            <div className="panel-head" style={{ marginTop: 20 }}><h3 className="panel-title">Never an input</h3></div>
            <div className="tags">
              {["Sex", "Race", "Ethnicity", "Age", "Neighbourhood (census tract)", "Preapproval request"].map((f) => <span key={f} className="tag off">{f}</span>)}
            </div>
            <p className="caption">
              Protected attributes are collected only to audit outcomes. Census-tract data was excluded because it widened
              the referral gap by acting as a proxy for race. Preapproval leaked the outcome in the training extract.
            </p>
          </section>

          <section className="block" aria-labelledby="rules-h">
            <div className="panel-head"><h2 id="rules-h" className="panel-title">Business rules</h2><span className="panel-meta">Run before the model</span></div>
            <table className="table">
              <tbody>
                {RULES.map(([k, v]) => <tr key={k}><td>{k}</td><td className="num" style={{ color: "var(--muted)" }}>{v}</td></tr>)}
              </tbody>
            </table>
            <p className="caption">
              Debt-to-income counts existing debts plus the new payment, estimated at {(a.interest_rate * 100).toFixed(1)}% with
              {" "}{(a.tax_and_insurance_rate * 100).toFixed(1)}% a year for tax and insurance.
            </p>
          </section>
        </div>

        <BiasReport bias={cardToBias(card)} title="Fairness audit of the deployed model" />

        <section className="block" aria-labelledby="rob-h">
          <div className="panel-head"><h2 id="rob-h" className="panel-title">Does it hold up?</h2><span className="panel-meta">Other years and unseen states</span></div>
          <table className="table">
            <thead>
              <tr><th scope="col">Test</th><th scope="col" className="num">ROC-AUC</th><th scope="col" className="num">In-state model</th><th scope="col" className="num">Wrong auto-approvals</th><th scope="col" className="num">Black–White referral gap</th></tr>
            </thead>
            <tbody>
              {card.robustness.drift.map((d) => (
                <tr key={`${d.train_year}-${d.test_year}`}>
                  <td>Georgia, trained {d.train_year} → tested {d.test_year}</td>
                  <td className="num">{f3(d.roc_auc)}</td><td className="num">—</td>
                  <td className="num">{pct(d.wrong_auto_approval)}</td><td className="num">—</td>
                </tr>
              ))}
              {card.robustness.states.map((s) => (
                <tr key={s.state}>
                  <td>{s.state} 2023 (never seen)</td>
                  <td className="num">{f3(s.roc_auc_transfer)}</td><td className="num">{f3(s.roc_auc_local)}</td>
                  <td className="num">{pct(s.wrong_auto_approval)}</td>
                  <td className="num">{s.black_referral_gap ? pts(s.black_referral_gap[0]) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="caption">A model that isn't retrained drifts past its error budget; the referral gap appears in every state tested.</p>
        </section>

        <section className="block" aria-labelledby="lim-h">
          <div className="panel-head"><h2 id="lim-h" className="panel-title">Limits worth knowing</h2></div>
          <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 8, fontSize: 14.5, color: "var(--ink-2)", maxWidth: "74ch" }}>
            <li>It models what lenders decided, not whether borrowers repaid. Lenders' own patterns, including any bias, are part of what it learns.</li>
            <li>Public HMDA data has no credit scores. Credit history and incomplete applications cause about a quarter of denials, which caps accuracy.</li>
            <li>Trained in Georgia; tested in four other states, but not nationwide.</li>
            <li>The debt-to-income ratio is estimated from an assumed interest rate; lenders use the real one.</li>
          </ul>
        </section>
      </div>
    </>
  )
}
