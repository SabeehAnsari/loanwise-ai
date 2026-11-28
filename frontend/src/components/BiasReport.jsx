import { Alert, Check } from "./Icons"

const pts = (v) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1)}`)
const ciText = (g) => (g ? `${pts(g[1])} to ${pts(g[2])}` : "")

// v2 audit of the deployed model on the 2023 test year: the gate (average approval gap) and the
// disclosed referral gaps at the operating threshold, per monitored group.
export default function BiasReport({ bias, title = "Fairness audit", plain = false }) {
  if (!bias) return null
  const cleared = bias.decision === "CLEARED"
  const groups = bias.groups || []

  return (
    <section className={plain ? "" : "block"} aria-labelledby="fair-h">
      <div className="panel-head">
        <h3 id="fair-h" className="panel-title">{title}</h3>
        <span className="status" data-tone={cleared ? "pass" : "fail"}>
          {cleared ? <Check size={14} /> : <Alert size={14} />}
          {cleared ? "Gate cleared" : "Failed: automation off"}
        </span>
      </div>

      <p style={{ fontSize: 14.5, color: "var(--ink-2)", maxWidth: "70ch" }}>
        Largest gap in average approval probability: <b>{(bias.bias_score * 100).toFixed(1)} points</b>
        {bias.worst_group ? ` (${bias.worst_group})` : ""}, against a limit of {(bias.threshold * 100).toFixed(0)}.
      </p>

      {bias.warning && (
        <div className="alert" data-tone="warn" style={{ marginTop: 12 }} role="note">
          <Alert size={16} />
          <span>{bias.warning}</span>
        </div>
      )}

      {groups.length > 0 && (
        <table className="table" style={{ marginTop: 14 }}>
          <thead>
            <tr>
              <th scope="col">Group vs reference</th>
              <th scope="col" className="num">n</th>
              <th scope="col" className="num">Lenders</th>
              <th scope="col" className="num">Model, average</th>
              <th scope="col" className="num">Referred at threshold</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const big = g.referral_gap[0] >= 0.05   // only gaps that disadvantage the group
              return (
                <tr key={`${g.attribute}-${g.group}`}>
                  <td>{g.group} <span style={{ color: "var(--muted)" }}>vs {g.reference}</span></td>
                  <td className="num" style={{ color: "var(--muted)" }}>{g.n.toLocaleString("en-US")}</td>
                  <td className="num" title={ciText(g.lender_gap)}>{pts(g.lender_gap[0])}</td>
                  <td className="num" title={ciText(g.model_gap)}>{pts(g.model_gap[0])}</td>
                  <td className="num" title={ciText(g.referral_gap)}
                    style={big ? { color: "var(--warn)", fontWeight: 600 } : undefined}>{pts(g.referral_gap[0])}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <p className="caption">
        Gaps in percentage points on the held-out 2023 Georgia data. Lenders and Model compare approval rates;
        Referred compares how often applicants the lender approved would be sent to a loan officer instead of
        auto-approved{bias.operating_threshold ? ` at the ${(bias.operating_threshold * 100).toFixed(0)}% threshold` : ""}.
        Sex, race, ethnicity and age are never model inputs; they are used only for this audit, which describes the
        model, not this applicant.{bias.stored && " Gate status as recorded when this application was run."}
      </p>
    </section>
  )
}
