import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams } from "react-router"
import LoanForm from "../components/LoanForm"
import ResultView, { ErrorPanel, ResultSkeleton } from "../components/ResultView"
import { usePipeline } from "../components/AppShell"
import { ArrowRight } from "../components/Icons"
import { runDecision } from "../lib/api"
import { useAuth } from "../lib/auth"
import { displayName } from "../lib/user"
import { SAMPLES, sampleById } from "../lib/samples"
import { useModelReport } from "../useModelReport"

const store = {
  get(k) { try { return localStorage.getItem(k) } catch { return null } },
  set(k, v) { try { localStorage.setItem(k, v) } catch { /* private mode */ } },
}

function Welcome({ firstRun, name, onSample, onDismiss }) {
  const { report } = useModelReport()
  const m = report?.metrics
  return (
    <section className="sheet welcome">
      <h2>{firstRun ? `Welcome, ${name}. Run your first decision.` : "Ready when you are."}</h2>
      <p>
        {firstRun
          ? "Pick a sample applicant to run it straight away, or fill in the form. You'll see the verdict, the factors that moved it, the fairness audit and the letter."
          : "Fill in the form, or run one of the sample applicants."}
      </p>
      {firstRun && (
        <ol className="steps">
          <li><span className="n">1</span><span><b>Describe the home and loan.</b> A sample or your own numbers. Sex, race, ethnicity and age are optional and audit-only.</span></li>
          <li><span className="n">2</span><span><b>Watch the pipeline.</b> The sidebar lights each stage: rules, model, fairness, letter, products.</span></li>
          <li><span className="n">3</span><span><b>Read the evidence.</b> Every run is saved to History and opens as its own page.</span></li>
        </ol>
      )}
      <div className="samples" style={{ marginTop: 22 }}>
        {SAMPLES.map((s) => (
          <button key={s.id} type="button" className="chip" onClick={() => onSample(s)}>
            <span>Run “{s.label}”</span>
            <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 400 }}>{s.hint}</span>
          </button>
        ))}
      </div>
      {m && (
        <div className="figs">
          <div className="fig"><b>{m.roc_auc.toFixed(3)}</b><span>ROC-AUC on {report.data.test.year}</span></div>
          <div className="fig"><b>{(report.policy.test_auto_approved_share * 100).toFixed(0)}%</b><span>Auto-approved, the rest go to a person</span></div>
          <div className="fig"><b>{(report.policy.threshold * 100).toFixed(0)}%</b><span>Auto-approve threshold</span></div>
          <div className="fig"><b>{report.data.train.rows.toLocaleString("en-US")}</b><span>Real {report.data.train.year} decisions trained on</span></div>
        </div>
      )}
      <div style={{ display: "flex", gap: 16, marginTop: 18, flexWrap: "wrap" }}>
        <Link to="/app/model" className="link">How the model was validated</Link>
        {firstRun && <button type="button" className="link" onClick={onDismiss}>Hide the walkthrough</button>}
      </div>
    </section>
  )
}

export default function NewDecision() {
  const { user } = useAuth()
  const { pipeline, setPipeline } = usePipeline()
  const [params] = useSearchParams()
  const [seed, setSeed] = useState(() => sampleById(params.get("sample")) || null)
  const [result, setResult] = useState(pipeline.source === "new" ? pipeline.result : null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const lastForm = useRef(null)
  const introKey = `lw:intro-done:${user?.id}`
  const [firstRun, setFirstRun] = useState(() => !store.get(introKey))

  useEffect(() => { setPipeline({ result, loading, source: "new" }) }, [result, loading, setPipeline])

  const run = async (form) => {
    lastForm.current = form
    setLoading(true)
    setError(null)
    setResult(null)
    if (window.matchMedia("(max-width: 1199px)").matches) {
      requestAnimationFrame(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }))
    }
    try {
      const data = await runDecision(form)
      setResult({ ...data, _applicant: form.name, _at: Date.now() })
      store.set(introKey, "1")
      setFirstRun(false)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  // ?sample=strong from the landing page or sign-up: fill and run once.
  const autoRan = useRef(false)
  useEffect(() => {
    if (seed && params.get("sample") && !autoRan.current) {
      autoRan.current = true
      run(seed.data)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runSample = (s) => { setSeed(s); run(s.data) }

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">New decision</h1>
          <p className="page-sub">Run an application through all five stages. Every result is also saved to History.</p>
        </div>
      </div>
      <div className="workspace">
        <LoanForm key={seed?.id || "blank"} initial={seed?.data} onSubmit={run} loading={loading} />
        <div id="results" style={{ scrollMarginTop: 120 }} aria-live="polite">
          {loading && <ResultSkeleton />}
          {!loading && error && (
            <ErrorPanel title="The application didn’t go through" message={error}
              onRetry={lastForm.current ? () => run(lastForm.current) : null} />
          )}
          {!loading && !error && result && <ResultView result={result} showLink />}
          {!loading && !error && !result && (
            <Welcome firstRun={firstRun} name={displayName(user)} onSample={runSample}
              onDismiss={() => { store.set(introKey, "1"); setFirstRun(false) }} />
          )}
        </div>
      </div>
    </>
  )
}
