import { Alert, Check } from "./Icons"

const pct = (v) => (v != null ? (v * 100).toFixed(1) + "%" : "—")

// Dot-and-whisker of a gap with its 95% CI, on a 0–25% axis with the 20% limit marked.
function CiPlot({ value, ci, limit, max = 0.25 }) {
  const x = (v) => `${Math.min(v / max, 1) * 100}%`
  return (
    <div className="ci" aria-hidden="true">
      <span className="ci-axis" />
      {ci && <span className="ci-range" style={{ left: x(ci[0]), width: `calc(${x(ci[1])} - ${x(ci[0])})` }} />}
      <span className="ci-limit" style={{ left: x(limit) }} />
      {value != null && <span className="ci-point" style={{ left: x(value) }} />}
    </div>
  )
}

export default function BiasReport({ bias }) {
  if (!bias) return null
  const cleared = bias.decision === "CLEARED"
  const threshold = bias.threshold ?? 0.2
  const ci = bias.confidence_intervals || {}
  const sizes = bias.group_sizes || {}
  const m = bias.metrics || {}

  const gaps = [
    { key: "gender_disparity", label: "Gender approval gap" },
    { key: "married_disparity", label: "Marital approval gap" },
    { key: "fnr_disparity", label: "False-negative-rate gap" },
  ]
  const rates = [
    { label: "Male", value: m.male_approval_rate, n: sizes.male },
    { label: "Female", value: m.female_approval_rate, n: sizes.female },
    { label: "Married", value: m.married_approval_rate, n: sizes.married },
    { label: "Single", value: m.single_approval_rate, n: sizes.single },
  ]

  return (
    <section className="block" aria-labelledby="tbl1">
      <div className="block-head">
        <h3 id="tbl1" className="block-title"><span className="fig">Table 1</span>Fairness audit of the deployed model</h3>
        <span className="status-line" data-tone={cleared ? "pass" : "fail"}>
          {cleared ? <Check size={15} /> : <Alert size={15} />}
          {cleared ? "Cleared" : "Failed: automation off"}
        </span>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th scope="col">Measure</th>
            <th scope="col" className="num">Value</th>
            <th scope="col" className="num">95% CI</th>
            <th scope="col" className="plot"><span className="sr-only">Plot</span>
              <div className="ci-scale" aria-hidden="true">
                <span style={{ left: 0 }}>0</span>
                <span className="ci-scale-limit" style={{ left: `${(threshold / 0.25) * 100}%` }}>limit {threshold.toFixed(2)}</span>              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {gaps.map((g) => (
            <tr key={g.key}>
              <td>{g.label}</td>
              <td className="num">{pct(m[g.key])}</td>
              <td className="num" style={{ color: "var(--muted)" }}>
                {ci[g.key] ? `${pct(ci[g.key][0])} – ${pct(ci[g.key][1])}` : "—"}
              </td>
              <td className="plot"><CiPlot value={m[g.key]} ci={ci[g.key]} limit={threshold} /></td>
            </tr>
          ))}
          <tr>
            <td><b>Bias score</b> <span style={{ color: "var(--muted)", fontSize: 13 }}>(combined)</span></td>
            <td className="num"><b>{bias.bias_score?.toFixed(3)}</b></td>
            <td className="num" style={{ color: "var(--muted)" }}>
              {ci.bias_score ? `${ci.bias_score[0].toFixed(3)} – ${ci.bias_score[1].toFixed(3)}` : `limit ${threshold.toFixed(2)}`}
            </td>
            <td className="plot"><CiPlot value={bias.bias_score} ci={ci.bias_score} limit={threshold} /></td>
          </tr>
        </tbody>
      </table>

      <div className="rates">
        {rates.map((r) => (
          <div key={r.label} className="rate">
            <b>{pct(r.value)}</b>
            <span>{r.label} approval rate</span>
            {r.n && <span className="rate-n">n = {r.n}</span>}
          </div>
        ))}
      </div>

      <p className="caption">
        Gaps are absolute differences between groups (shown as percentages, plotted as proportions); the bias score
        combines them on the same 0–0.25 axis, so all four rows share the {threshold.toFixed(2)} limit line.
        Measured once on out-of-fold predictions across the training data, so it is the same for every applicant.
        Gender and marital status are not model inputs; they are used only for this audit. If the bias score
        exceeds {threshold.toFixed(2)}, automated decisions switch off and every application goes to human review.
      </p>
    </section>
  )
}
