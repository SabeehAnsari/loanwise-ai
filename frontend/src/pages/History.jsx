import { useMemo, useState } from "react"
import { Link, useNavigate } from "react-router"
import { ErrorPanel } from "../components/ResultView"
import { Chevron, Plus, Search } from "../components/Icons"
import { useApplications } from "../lib/useApplications"
import { verdictOf } from "../pipeline"
import { formatWhen, money } from "../lib/records"

const FILTERS = [
  ["all", "All"], ["approved", "Approved"], ["referred", "Referred"], ["rules", "Rules"], ["review", "Review"],
]

function kindOf(row) {
  if (row.status === "REJECTED_BY_RULES") return "rules"
  if (row.status === "HUMAN_REVIEW") return "review"
  return row.decision === "APPROVED" ? "approved" : "referred"
}

function VerdictCell({ row }) {
  const v = verdictOf(row)
  const label = row.status === "REJECTED_BY_RULES" ? "Denied by rules" : v.word
  return <span className="status" data-tone={v.tone}>{label}</span>
}

export default function History() {
  const { rows, error, loading, reload } = useApplications()
  const [filter, setFilter] = useState("all")
  const [q, setQ] = useState("")
  const navigate = useNavigate()

  const counts = useMemo(() => {
    const c = { all: 0, approved: 0, referred: 0, rules: 0, review: 0 }
    for (const r of rows || []) { c.all += 1; c[kindOf(r)] += 1 }
    return c
  }, [rows])

  const shown = useMemo(() => (rows || []).filter((r) =>
    (filter === "all" || kindOf(r) === filter) &&
    (!q.trim() || (r.applicant_name || "").toLowerCase().includes(q.trim().toLowerCase()))
  ), [rows, filter, q])

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">History</h1>
          <p className="page-sub">Every application you've run, including rule rejections and human-review cases.</p>
        </div>
        <Link to="/app/new" className="btn btn-primary"><Plus size={16} />New decision</Link>
      </div>

      {error && <ErrorPanel title="Couldn’t load your history" message={error} onRetry={reload} />}

      {!error && (
        <>
          <div className="toolbar">
            <div className="seg" role="radiogroup" aria-label="Filter by outcome">
              {FILTERS.map(([id, label]) => (
                <label key={id}>
                  <input type="radio" name="filter" value={id} checked={filter === id} onChange={() => setFilter(id)} />
                  <span>{label}{rows && <em>{counts[id]}</em>}</span>
                </label>
              ))}
            </div>
            <div className="search">
              <Search size={15} />
              <input className="input" type="search" placeholder="Search applicant" value={q}
                onChange={(e) => setQ(e.target.value)} aria-label="Search by applicant name" />
            </div>
          </div>

          <div className="sheet list">
            {loading && !rows ? (
              <div aria-busy="true" aria-label="Loading history">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} style={{ display: "flex", gap: 24, padding: "16px 14px", borderTop: i ? "1px solid var(--line)" : 0 }}>
                    <div className="skel" style={{ height: 12, width: 160 }} />
                    <div className="skel" style={{ height: 12, width: 90 }} />
                    <div className="skel" style={{ height: 12, flex: 1 }} />
                  </div>
                ))}
              </div>
            ) : rows && rows.length === 0 ? (
              <div className="empty">
                <h3>No decisions yet</h3>
                <p>Run your first application and it will appear here, with its verdict, factors, audit and letter.</p>
                <Link to="/app/new" className="btn btn-primary"><Plus size={16} />Run a decision</Link>
              </div>
            ) : shown.length === 0 ? (
              <div className="empty">
                <h3>Nothing matches</h3>
                <p>No applications match this filter{q ? ` and “${q}”` : ""}.</p>
                <button type="button" className="btn btn-glass" onClick={() => { setFilter("all"); setQ("") }}>Clear filters</button>
              </div>
            ) : (
              <table className="list-table">
                <thead>
                  <tr>
                    <th scope="col">Applicant</th>
                    <th scope="col">Outcome</th>
                    <th scope="col" className="num">Probability</th>
                    <th scope="col" className="num hide-sm">Loan</th>
                    <th scope="col" className="hide-sm">Run</th>
                    <th scope="col"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id} onClick={() => navigate(`/app/decisions/${r.id}`)}>
                      <td className="name"><Link to={`/app/decisions/${r.id}`} onClick={(e) => e.stopPropagation()}>{r.applicant_name || "Unnamed"}</Link></td>
                      <td><VerdictCell row={r} /></td>
                      <td className="num">{r.probability != null ? `${(r.probability * 100).toFixed(1)}%` : "—"}</td>
                      <td className="num hide-sm">{r.loan_amount != null ? `${money(r.loan_amount)} · ${r.loan_amount_term / 12} yr` : "—"}</td>
                      <td className="when hide-sm">{formatWhen(Date.parse(r.created_at))}</td>
                      <td className="chev"><Chevron size={16} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {rows && rows.length > 0 && (
            <p className="caption">
              {counts.all} decisions · {counts.approved} auto-approved · {counts.referred} referred to a loan officer · {counts.rules} stopped by rules · {counts.review} held for review
            </p>
          )}
        </>
      )}
    </>
  )
}
