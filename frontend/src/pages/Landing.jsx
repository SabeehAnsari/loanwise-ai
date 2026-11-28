import { useRef, useState } from "react"
import { Link } from "react-router"
import BiasReport from "../components/BiasReport"
import { ArrowRight, Brand, Check, Github, Product } from "../components/Icons"
import { useAuth } from "../lib/auth"
import { cardToBias } from "../lib/records"
import { PUBLISHED_REPORT, useModelReport } from "../useModelReport"

const REPO = "https://github.com/SabeehAnsari/loanwise-ai"
const f3 = (v) => v.toFixed(3)
const pct = (v, d = 1) => `${(v * 100).toFixed(d)}%`
const pts = (v) => `${v > 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(1)}`

// The "Strong applicant" sample (synthetic person) and the deployed v2 model's real output for it.
const SAMPLE = {
  name: "Priya Raman", probability: 0.9734, dti: 25.1, ltv: 80.0, payment: 1825,
  factors: [["Debt-to-income ratio", 0.607], ["Loan-to-value ratio", 0.355], ["Property value", 0.1935], ["Co-applicant", 0.157]],
  products: ["Rate lock (60 days)", "15-year fixed-rate mortgage"],
}

function Bars() {
  const max = Math.max(...SAMPLE.factors.map(([, v]) => Math.abs(v)))
  return (
    <ul className="shap" style={{ marginTop: 18 }}>
      {SAMPLE.factors.map(([label, v]) => (
        <li key={label} className="shap-row">
          <span>{label}</span>
          <span className="shap-axis" aria-hidden="true"><span className={`shap-bar ${v > 0 ? "pos" : "neg"}`} style={{ width: `${(Math.abs(v) / max) * 50}%` }} /></span>
          <span className={`shap-val ${v > 0 ? "pos" : "neg"}`}>{v > 0 ? "+" : "−"}{Math.abs(v).toFixed(2)}</span>
        </li>
      ))}
    </ul>
  )
}

function StagePane({ id, card }) {
  const t = card.policy.threshold
  const gate = card.fairness.gate
  if (id === "rules") return (
    <div className="demo-pane" key={id}>
      <h3>Rules screen it before any model does.</h3>
      <p>Four hard rules run first. A clearly ineligible application is denied here and never reaches the model.</p>
      <table className="table" style={{ marginTop: 18 }}>
        <tbody>
          {[["Household income", "$125,000 / yr", "≥ $10,000"], ["Loan amount", "$280,000", "> 0"],
            ["Loan-to-value", `${SAMPLE.ltv.toFixed(1)}%`, "≤ 100%"], ["Est. debt-to-income", `${SAMPLE.dti.toFixed(1)}%`, "≤ 60%"]].map(([k, v, lim]) => (
            <tr key={k}><td>{k}</td><td className="num" style={{ color: "var(--muted)" }}>{lim}</td><td className="num">{v}</td><td className="num"><span className="status" data-tone="pass">Passed</span></td></tr>
          ))}
        </tbody>
      </table>
    </div>
  )
  if (id === "model") return (
    <div className="demo-pane" key={id}>
      <div className="masthead"><b>{SAMPLE.name}</b><span>Sample applicant · {card.model_version}</span></div>
      <div className="verdict-line"><span className="verdict-word" data-tone="pass">Approved</span><p className="verdict-prob"><b>{pct(SAMPLE.probability)}</b><span>approval probability</span></p></div>
      <div className="prob-scale"><span className="track" /><span className="fill" style={{ width: pct(SAMPLE.probability), background: "var(--pass)" }} /><span className="cut" style={{ left: pct(t) }} /></div>
      <Bars />
      <p className="demo-label">A sample applicant scored by the deployed model. Pick another stage above to see its evidence.</p>
    </div>
  )
  if (id === "fairness") return (
    <div className="demo-pane" key={id}>
      <h3>An audit that is published, not hidden.</h3>
      <p>
        Gaps by sex, race, ethnicity and age on {card.data.test.rows.toLocaleString("en-US")} held-out decisions. The gate
        switches automation off above its limit; the larger gaps at the threshold are disclosed with every decision.
      </p>
      <div className="figs" style={{ borderTop: 0, paddingTop: 0 }}>
        <div className="fig"><b>{(gate.value * 100).toFixed(1)}</b><span>Largest average gap (points), limit {(gate.limit * 100).toFixed(0)}</span></div>
        <div className="fig"><b>{pts(card.fairness.groups.find((g) => g.group.startsWith("Black")).referral_gap[0])}</b><span>Black–White referral gap at the threshold</span></div>
      </div>
    </div>
  )
  if (id === "email") return (
    <div className="demo-pane" key={id}>
      <h3>A letter that must pass guardrails.</h3>
      <p>An LLM writes the letter. Rule-based checks reject it and try again, up to three times, before a person takes over.</p>
      <ul className="products" style={{ marginTop: 14 }}>
        {["No invented interest rates or payment amounts", "States the actual decision, without contradiction",
          "A referral never reads as an approval or a denial", "Signed by the LoanWise AI team"].map((x) => (
          <li key={x}><Check size={17} style={{ color: "var(--pass)" }} />{x}</li>
        ))}
      </ul>
    </div>
  )
  return (
    <div className="demo-pane" key={id}>
      <h3>Products chosen by rules, not by the model.</h3>
      <p>Eligibility is deterministic. The language model only writes the recommendation text.</p>
      <ul className="products" style={{ marginTop: 14 }}>
        {SAMPLE.products.map((p) => <li key={p}><Product size={18} />{p}</li>)}
      </ul>
      <p className="demo-label">For the sample applicant</p>
    </div>
  )
}

const TABS = [
  ["rules", "1", "Rules", "Passed"],
  ["model", "2", "Model", pct(SAMPLE.probability)],
  ["fairness", "3", "Fairness", "Cleared"],
  ["email", "4", "Letter", "1 try"],
  ["products", "5", "Products", `${SAMPLE.products.length} eligible`],
]

function StageDemo({ card }) {
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
        <StagePane id={active} card={card} />
      </div>
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const { report: live } = useModelReport()
  const card = live || PUBLISHED_REPORT
  const p = card.policy
  const rule = card.comparison.find((c) => c.name.startsWith("One-line rule"))
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
            <h1>Mortgage decisions that <span>show their working.</span></h1>
            <p className="lede">
              Trained on {card.data.train.rows.toLocaleString("en-US")} real US lending decisions. Rules screen every
              application, XGBoost scores it, SHAP explains it, a fairness gate audits it, and guardrails check the letter.
              The model approves or refers to a person. It never denies on its own.
            </p>
            <div className="ctas">
              <Link to={tryHref} className="btn btn-primary btn-lg">Try the demo <ArrowRight size={18} className="nudge" /></Link>
              <a href="#evidence" className="btn btn-glass btn-lg">Read the model card</a>
            </div>
            <div className="facts">
              <span><b>{f3(card.metrics.roc_auc)}</b>ROC-AUC on {card.data.test.year}</span>
              <span><b>{pct(p.test_auto_approved_share, 0)}</b>approved automatically</span>
              <span><b>{pct(p.test_wrong_auto_approval)}</b>of those, lender denied</span>
            </div>
          </div>
          <StageDemo card={card} />
        </section>

        <section className="band" id="how" aria-labelledby="how-h">
          <div className="band-head">
            <h2 id="how-h">Five stages. Each one leaves evidence.</h2>
            <p>One request runs the whole pipeline. If any stage can&rsquo;t vouch for the result, a person decides instead.</p>
          </div>
          <ol className="how">
            {[
              ["Business rules", "Income, loan-to-value and estimated debt-to-income are checked first. Fail one and the model never runs."],
              ["Model + SHAP", "Monotonic XGBoost scores the application; TreeSHAP shows the factors that moved this score."],
              ["Fairness gate", "The deployed model's group gaps are audited on held-out data. Over the limit, automation switches off."],
              ["Email guardrails", "An LLM drafts the letter; rule checks reject invented numbers or a contradicted decision."],
              ["Products", "Eligible products come from deterministic rules; the LLM only writes the wording."],
            ].map(([t, d]) => (
              <li key={t}><h3>{t}</h3><p>{d}</p></li>
            ))}
          </ol>
        </section>

        <section className="band split" id="evidence" aria-labelledby="ev-h">
          <div className="band-head">
            <h2 id="ev-h">Tested on next year&rsquo;s applicants, and on states it never saw.</h2>
            <p>
              Trained on {card.data.train.state} {card.data.train.year}, tested once on {card.data.test.year}. The textbook
              &ldquo;approve if debt-to-income is at most 43%&rdquo; rule scores {f3(rule.roc_auc)}. Applied unchanged to North
              Carolina, Ohio, Arizona and Washington, the model stays close to models trained in each state.
            </p>
          </div>
          <div className="sheet panel">
            <table className="table">
              <thead><tr><th scope="col">Model</th><th scope="col" className="num">ROC-AUC</th><th scope="col" className="num">Denial PR-AUC</th></tr></thead>
              <tbody>
                {card.comparison.filter((c) => c.name !== "Majority class (approve everyone)").map((c) => (
                  <tr key={c.name} className={c.name === "XGBoost (monotonic)" ? "em" : ""}>
                    <td>{c.name === "XGBoost (monotonic)" ? "LoanWise (monotonic XGBoost)" : c.name}</td>
                    <td className="num">{f3(c.roc_auc)}</td><td className="num">{f3(c.pr_auc_denial)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="caption">Public HMDA records. Sex, race, ethnicity and age are never inputs; they are used only to audit outcomes.</p>
          </div>
        </section>

        <section className="band split" id="fairness" aria-labelledby="fair-band-h">
          <div className="band-head">
            <h2 id="fair-band-h">Fairer on average is not fair at the threshold.</h2>
            <p>
              The model explains about two-thirds of lenders&rsquo; average racial gap from finances alone. But at the
              auto-approve threshold, small average gaps become large referral gaps. That pattern appeared in every state
              tested, so it is shown here and with every decision rather than hidden.
            </p>
          </div>
          <div className="sheet panel"><BiasReport bias={cardToBias(card)} title="Deployed model" plain /></div>
        </section>

        <section className="glass closing">
          <h2>Run a decision and read every reason behind it.</h2>
          <div className="ctas" style={{ marginTop: 0 }}>
            <Link to={tryHref} className="btn btn-primary btn-lg">Try the demo <ArrowRight size={18} className="nudge" /></Link>
            <a href={REPO} target="_blank" rel="noreferrer" className="btn btn-glass btn-lg"><Github size={17} />Source code</a>
          </div>
        </section>

        <footer className="footer">
          <span>LoanWise AI · an educational project on public HMDA data. Not for real lending decisions.</span>
          <span>React · FastAPI · XGBoost · Supabase · <a href={REPO} target="_blank" rel="noreferrer">GitHub</a></span>
        </footer>
      </main>
    </>
  )
}
