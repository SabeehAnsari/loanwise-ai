import { useRef, useState } from "react"
import { Link } from "react-router"
import BiasReport from "../components/BiasReport"
import { ArrowRight, Brand, Check, Github, Product } from "../components/Icons"
import { useAuth } from "../lib/auth"
import { auditToBias } from "../lib/records"
import { MAJORITY_BASELINE, PUBLISHED_REPORT, useModelReport } from "../useModelReport"

const REPO = "https://github.com/SabeehAnsari/loanwise-ai"
const f3 = (v) => v.toFixed(3)

// Synthetic sample used to demonstrate the stages; model figures elsewhere are real.
const SAMPLE_FACTORS = [
  ["Credit history", 1.42], ["Total income", 0.28], ["Income-to-loan ratio", -0.19], ["Property area", 0.12],
]

function Bars() {
  const max = 1.42
  return (
    <ul className="shap" style={{ marginTop: 18 }}>
      {SAMPLE_FACTORS.map(([label, v]) => (
        <li key={label} className="shap-row">
          <span>{label}</span>
          <span className="shap-axis" aria-hidden="true"><span className={`shap-bar ${v > 0 ? "pos" : "neg"}`} style={{ width: `${(Math.abs(v) / max) * 50}%` }} /></span>
          <span className={`shap-val ${v > 0 ? "pos" : "neg"}`}>{v > 0 ? "+" : "−"}{Math.abs(v).toFixed(2)}</span>
        </li>
      ))}
    </ul>
  )
}

function StagePane({ id, report }) {
  const audit = report.fairness_audit
  if (id === "rules") return (
    <div className="demo-pane" key={id}>
      <h3>Rules screen it before any model does.</h3>
      <p>Four hard rules run first. A clearly ineligible application is denied here and never reaches the model.</p>
      <table className="table" style={{ marginTop: 18 }}>
        <tbody>
          {[["Combined monthly income", "$7,200", "≥ $500"], ["Loan amount", "$128,000", "> 0"], ["Loan amount cap", "$128,000", "≤ $10M"], ["Repayment-to-income", "4.9%", "≤ 60%"]].map(([k, v, lim]) => (
            <tr key={k}><td>{k}</td><td className="num" style={{ color: "var(--muted)" }}>{lim}</td><td className="num">{v}</td><td className="num"><span className="status" data-tone="pass">Passed</span></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
  if (id === "model") return (
    <div className="demo-pane" key={id}>
      <div className="masthead"><b>Priya Raman</b><span>Synthetic sample · {report.model_version}</span></div>
      <div className="verdict-line"><span className="verdict-word" data-tone="pass">Approved</span><p className="verdict-prob"><b>84.2%</b><span>approval probability</span></p></div>
      <div className="prob-scale"><span className="track" /><span className="fill" style={{ width: "84.2%", background: "var(--pass)" }} /><span className="cut" style={{ left: "50%" }} /></div>
      <Bars />
      <p className="demo-label">Synthetic sample applicant. Pick another stage above to see its evidence.</p>
    </div>
  )
  if (id === "fairness") return (
    <div className="demo-pane" key={id}>
      <h3>An audit that can switch automation off.</h3>
      <p>Approval and error-rate gaps by gender and marital status, measured on out-of-fold predictions. Above the limit, every application goes to a person.</p>
      <div className="big-num" style={{ fontSize: 72, marginTop: 20 }}>{f3(audit.bias_score)}<small>bias score against a {audit.threshold.toFixed(2)} limit · 95% CI {f3(audit.confidence_intervals.bias_score[0])}–{f3(audit.confidence_intervals.bias_score[1])}</small></div>
    </div>
  )
  if (id === "email") return (
    <div className="demo-pane" key={id}>
      <h3>A letter that must pass guardrails.</h3>
      <p>An LLM writes the decision letter. Rule-based checks reject it and try again, up to three times, before a person takes over.</p>
      <ul className="products" style={{ marginTop: 14 }}>
        {["No invented interest rates or payment amounts", "States the actual decision, without contradiction", "Within length limits", "Signed by the LoanWise AI team"].map((t) => (
          <li key={t}><Check size={17} style={{ color: "var(--pass)" }} />{t}</li>
        ))}
      </ul>
    </div>
  )
  return (
    <div className="demo-pane" key={id}>
      <h3>Products chosen by rules, not by the model.</h3>
      <p>Eligibility is deterministic. The language model only writes the recommendation text.</p>
      <ul className="products" style={{ marginTop: 14 }}>
        {["Home Improvement Line of Credit", "Fixed-rate Refinance"].map((p) => <li key={p}><Product size={18} />{p}</li>)}
      </ul>
      <p className="demo-label">Synthetic sample</p>
    </div>
  )
}

const TABS = [
  ["rules", "1", "Rules", "Passed"],
  ["model", "2", "Model", "84.2%"],
  ["fairness", "3", "Fairness", "Cleared"],
  ["email", "4", "Letter", "1 try"],
  ["products", "5", "Products", "2 eligible"],
]

function StageDemo({ report }) {
  const [active, setActive] = useState("model")
  const refs = useRef([])
  const onKey = (e, i) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0
    if (!d) return
    e.preventDefault()
    const n = (i + d + TABS.length) % TABS.length
    setActive(TABS[n][0])
    refs.current[n]?.focus()
  }
  return (
    <div className="demo">
      <div className="glass demo-strip" role="tablist" aria-label="Pipeline stages">
        {TABS.map(([id, no, name, val], i) => (
          <button key={id} ref={(el) => (refs.current[i] = el)} type="button" role="tab" id={`tab-${id}`}
            aria-selected={active === id} aria-controls="stage-pane" tabIndex={active === id ? 0 : -1}
            className="demo-tab" onClick={() => setActive(id)} onKeyDown={(e) => onKey(e, i)}>
            <span className="tab-meta">{no} · {val}</span><b>{name}</b>
          </button>
        ))}
      </div>
      <div className="sheet demo-sheet" role="tabpanel" id="stage-pane" aria-labelledby={`tab-${active}`}>
        <StagePane id={active} report={report} />
      </div>
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const { report: live } = useModelReport()
  const report = live || PUBLISHED_REPORT
  const m = report.evaluation.metrics
  const base = report.evaluation.credit_history_rule_baseline
  const tryHref = user ? "/app/new?sample=strong" : "/signup?sample=strong"

  return (
    <>
      <header className="glass site-nav">
        <Brand as={Link} to="/" />
        <nav className="links" aria-label="Site">
          <a href="#how">How it works</a>
          <a href="#evidence">Model</a>
          <a href="#fairness">Fairness</a>
          <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
        </nav>
        {user
          ? <Link to="/app/new" className="btn btn-primary">Open the app</Link>
          : <>
              <Link to="/signin" className="btn btn-quiet">Sign in</Link>
              <Link to={tryHref} className="btn btn-primary">Try the demo</Link>
            </>}
      </header>

      <main className="wrap">
        <section className="hero">
          <div>
            <h1>Loan decisions that <span>show their working.</span></h1>
            <p className="lede">
              Rules screen every application, XGBoost scores it, SHAP explains it, a fairness gate audits it,
              and guardrails check the letter before it is sent.
            </p>
            <div className="ctas">
              <Link to={tryHref} className="btn btn-primary btn-lg">Try the demo <ArrowRight size={18} className="nudge" /></Link>
              <a href="#evidence" className="btn btn-glass btn-lg">Read the model card</a>
            </div>
            <div className="facts">
              <span><b>{f3(m.roc_auc.mean)}</b>ROC-AUC vs {f3(base.roc_auc)} rule</span>
              <span><b>{report.training_rows}</b>applications, CV ×10</span>
              <span><b>{f3(report.fairness_audit.bias_score)}</b>bias score, limit {report.fairness_audit.threshold.toFixed(2)}</span>
            </div>
          </div>
          <StageDemo report={report} />
        </section>

        <section className="band" id="how" aria-labelledby="how-h">
          <div className="band-head">
            <h2 id="how-h">Five stages. Each one leaves evidence.</h2>
            <p>One request runs the whole pipeline. If any stage can&rsquo;t vouch for the result, a person decides instead.</p>
          </div>
          <ol className="how">
            {[
              ["Business rules", "Income, the loan cap and repayment-to-income are checked first. Fail one and the model never runs."],
              ["Model + SHAP", "A shallow XGBoost model scores the application; TreeSHAP shows the factors that moved this score."],
              ["Fairness gate", "The deployed model's group gaps are audited offline. Over the limit, automation switches off."],
              ["Email guardrails", "An LLM drafts the letter; rule checks reject invented numbers or a contradicted decision."],
              ["Products", "Eligible products come from deterministic rules; the LLM only writes the wording."],
            ].map(([t, d]) => (
              <li key={t}><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>
        </section>

        <section className="band split" id="evidence" aria-labelledby="ev-h">
          <div className="band-head">
            <h2 id="ev-h">It barely beats a one-line rule. It says so.</h2>
            <p>Accuracy is within a point of &ldquo;approve if credit history is clean&rdquo;. Where the model earns its place is ranking risk inside the good-credit group.</p>
          </div>
          <div className="sheet panel">
            <table className="table">
              <thead><tr><th scope="col">Model</th><th scope="col" className="num">Accuracy</th><th scope="col" className="num">Balanced</th><th scope="col" className="num">ROC-AUC</th></tr></thead>
              <tbody>
                <tr><td>Majority class</td><td className="num">{f3(MAJORITY_BASELINE.accuracy)}</td><td className="num">{f3(MAJORITY_BASELINE.balanced_accuracy)}</td><td className="num">{f3(MAJORITY_BASELINE.roc_auc)}</td></tr>
                <tr><td>Credit-history rule</td><td className="num">{f3(base.accuracy)}</td><td className="num">{f3(base.balanced_accuracy)}</td><td className="num">{f3(base.roc_auc)}</td></tr>
                <tr className="em"><td>LoanWise XGBoost</td><td className="num">{f3(m.accuracy.mean)}</td><td className="num">{f3(m.balanced_accuracy.mean)}</td><td className="num">{f3(m.roc_auc.mean)}</td></tr>
              </tbody>
            </table>
            <p className="caption">{report.training_rows} public applications. Gender and marital status are not model inputs; removing them cost no accuracy.</p>
          </div>
        </section>

        <section className="band split" id="fairness" aria-labelledby="fair-band-h">
          <div className="band-head">
            <h2 id="fair-band-h">Audited before it is trusted.</h2>
            <p>Each applicant is scored by a model that never saw them, and the gaps between groups come with bootstrap confidence intervals. The intervals are wide, because the data is small, and the page shows that rather than hiding it.</p>
          </div>
          <div className="sheet panel"><BiasReport bias={auditToBias(report.fairness_audit, report.model_version)} title="Deployed model" plain /></div>
        </section>

        <section className="glass closing">
          <h2>Run a decision and read every reason behind it.</h2>
          <div className="ctas" style={{ marginTop: 0 }}>
            <Link to={tryHref} className="btn btn-primary btn-lg">Try the demo <ArrowRight size={18} className="nudge" /></Link>
            <a href={REPO} target="_blank" rel="noreferrer" className="btn btn-glass btn-lg"><Github size={17} />Source code</a>
          </div>
        </section>

        <footer className="footer">
          <span>LoanWise AI · an educational project on a public 614-row dataset. Not for real lending decisions.</span>
          <span>React · FastAPI · XGBoost · Supabase · <a href={REPO} target="_blank" rel="noreferrer">GitHub</a></span>
        </footer>
      </main>
    </>
  )
}
