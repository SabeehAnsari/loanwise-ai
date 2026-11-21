import { Alert, Check } from "./Icons"

const pct = (v) => (v != null ? (v * 100).toFixed(1) + "%" : "—")
const AXIS_MAX = 0.25

// Dot-and-whisker of a gap with its 95% CI, on a 0–0.25 axis with the limit marked.
function CiPlot({ value, ci, limit }) {
  const x = (v) => `${Math.min(v / AXIS_MAX, 1) * 100}%`
  return (
    <div className="ci" aria-hidden="true">
      <span className="ci-axis" />
      {ci && <span className="ci-range" style={{ left: x(ci[0]), width: `calc(${x(ci[1])} - ${x(ci[0])})` }} />}
      <span className="ci-limit" style={{ left: x(limit) }} />
      {value != null && <span className="ci-point" style={{ left: x(value) }} />}
    </div>
  )
}

export default function BiasReport({ bias, title = "Fairness audit", plain = false }) {
  if (!bias) return null
  const cleared = bias.decision === "CLEARED"
  const threshold = bias.threshold ?? 0.2
  const ci = bias.confidence_intervals || {}
  const sizes = bias.group_sizes || {}
  const m = bias.metrics || {}

  const gaps = [
    { key: "gender_disparity", label: "Gender approval gap" },
    { key: "married_disparity", label: "Marital approval gap" },
    { key: "fnr_disparity", label: "False-negative gap" },
  ]
  const rates = [
    { label: "Male", value: m.male_approval_rate, n: sizes.male },
    { label: "Female", value: m.female_approval_rate, n: sizes.female },
    { label: "Married", value: m.married_approval_rate, n: sizes.married },
    { label: "Single", value: m.single_approval_rate, n: sizes.single },
  ]
  const hasRates = rates.some((r) => r.value != null)
  const hasCi = Object.keys(ci).length > 0

  return (
    <section className={plain ? "" : "block"} aria-labelledby="fair-h">
      <div className="panel-head">
        <h3 id="fair-h" className="panel-title">{title}</h3>
        <span className="status" data-tone={cleared ? "pass" : "fail"}>
          {cleared ? <Check size={14} /> : <Alert size={14} />}
          {cleared ? "Cleared" : "Failed: automation off"}
        </span>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col" className="num">Value</th>
            {hasCi && <th scope="col" className="num">95% CI</th>}
            <th scope="col" className="plot"><span className="sr-only">Plot</span>
              <div className="ci-scale" aria-hidden="true">
                <span style={{ left: 0 }}>0</span>
                <span className="ci-scale-limit" style={{ left: `${(threshold / AXIS_MAX) * 100}%` }}>limit {threshold.toFixed(2)}</span>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((g) => (
            <tr key={g.key}>
              <td>{g.label}</td>
              <td className="num">{pct(m[g.key])}</td>
              {hasCi && <td className="num" style={{ color: "var(--muted)" }}>{ci[g.key] ? `${pct(ci[g.key][0])} – ${pct(ci[g.key][1])}` : "—"}</td>}
              <td className="plot"><CiPlot value={m[g.key]} ci={ci[g.key]} limit={threshold} /></td>
            </tr>
          ))}
          <tr className="em">
            <td>Bias score <span style={{ color: "var(--muted)", fontWeight: 400, fontSize: 13 }}>(combined)</span></td>
            <td className="num">{bias.bias_score != null ? bias.bias_score.toFixed(3) : "—"}</td>
            {hasCi && <td className="num" style={{ color: "var(--muted)", fontWeight: 400 }}>{ci.bias_score ? `${ci.bias_score[0].toFixed(3)} – ${ci.bias_score[1].toFixed(3)}` : "—"}</td>}
            <td className="plot"><CiPlot value={bias.bias_score} ci={ci.bias_score} limit={threshold} /></td>
          </tr>
        </tbody>
      </table>

      {hasRates && (
        <div className="figs" aria-label="Approval rate by group">
          <p className="figs-title">Approval rate by group</p>
          {rates.map((r) => (
            <div key={r.label} className="fig">
              <b>{pct(r.value)}</b>
              <span>{r.label}</span>
              {r.n && <small>n = {r.n}</small>}
            </div>
          ))}
        </div>
      )}

      <p className="caption">
        Measured on out-of-fold predictions across the training data, so it is the same for every applicant.
        Gender and marital status are not model inputs; they are used only for this audit. Above {threshold.toFixed(2)},
        automated decisions switch off and every application goes to human review.
        {bias.stored && " Values as recorded when this application was run."}
      </p>
    </section>
  )
}
