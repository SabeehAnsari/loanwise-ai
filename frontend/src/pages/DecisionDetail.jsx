import { useEffect, useMemo, useState } from "react"
import { Link, useParams } from "react-router"
import ResultView, { ErrorPanel, ResultSkeleton } from "../components/ResultView"
import { usePipeline } from "../components/AppShell"
import { ArrowLeft, Check, LinkIcon } from "../components/Icons"
import { useApplications } from "../lib/useApplications"
import { inputsOf, recordToResult } from "../lib/records"
import { useModelReport } from "../useModelReport"

export default function DecisionDetail() {
  const { id } = useParams()
  const { rows, error, loading, reload } = useApplications()
  const { report } = useModelReport()
  const { setPipeline } = usePipeline()
  const [copied, setCopied] = useState(false)

  const row = rows?.find((r) => String(r.id) === id)
  const result = useMemo(() => (row ? recordToResult(row, report) : null), [row, report])

  useEffect(() => { setPipeline({ result, loading: false, source: "detail" }) }, [result, setPipeline])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked */ }
  }

  return (
    <>
      <Link to="/app/history" className="crumb"><ArrowLeft size={15} />History</Link>
      <div className="page-head">
        <div>
          <h1 className="page-title">{row?.applicant_name || (loading ? "Loading…" : "Decision")}</h1>
          <p className="page-sub">Saved decision. Only you can open this page while signed in.</p>
        </div>
        {row && (
          <button type="button" className="btn btn-glass" onClick={copyLink}>
            {copied ? <Check size={15} /> : <LinkIcon size={15} />}{copied ? "Link copied" : "Copy link"}
          </button>
        )}
      </div>

      {error && <ErrorPanel title="Couldn’t load this decision" message={error} onRetry={reload} />}
      {!error && loading && !rows && <ResultSkeleton label="Loading decision" />}
      {!error && rows && !row && (
        <section className="sheet empty">
          <h3>Decision not found</h3>
          <p>It may belong to another account, or the link is incomplete.</p>
          <Link to="/app/history" className="btn btn-glass">Back to History</Link>
        </section>
      )}
      {result && (
        <div className="detail">
          <ResultView result={result} />
          <aside className="sheet panel inputs">
            <div className="panel-head"><h3 className="panel-title">Application</h3></div>
            <dl>
              {inputsOf(row).map(([k, v]) => (
                <div className="row" key={k}><dt>{k}</dt><dd>{v}</dd></div>
              ))}
            </dl>
          </aside>
        </div>
      )}
    </>
  )
}
