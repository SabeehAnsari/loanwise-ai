const pct = (v) => (v != null ? (v * 100).toFixed(1) + "%" : "N/A")

export default function BiasReport({ bias }) {
  if (!bias) return null
  const cleared = bias.decision === "CLEARED"
  const threshold = bias.threshold ?? 0.2
  const ci = bias.confidence_intervals || {}
  const sizes = bias.group_sizes || {}

  const gaps = [
    { key: "gender_disparity", label: "Gender approval gap" },
    { key: "married_disparity", label: "Marital approval gap" },
    { key: "fnr_disparity", label: "False-negative-rate gap" },
  ]
  const rates = [
    { label: "Male approval rate", value: bias.metrics?.male_approval_rate, n: sizes.male },
    { label: "Female approval rate", value: bias.metrics?.female_approval_rate, n: sizes.female },
    { label: "Married approval rate", value: bias.metrics?.married_approval_rate, n: sizes.married },
    { label: "Single approval rate", value: bias.metrics?.single_approval_rate, n: sizes.single },
  ]

  return (
    <div className={`card ${cleared ? "card-accent-green" : "card-accent-red"} p-6`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}>Fairness Audit · Deployed Model</p>
          <h3 className="text-lg font-bold" style={{ color: "var(--navy)" }}>
            Fairness Analysis
          </h3>
        </div>
        <span className="text-xs px-3 py-1.5 rounded-full font-semibold"
          style={{
            background: cleared ? "var(--success-light)" : "var(--danger-light)",
            color: cleared ? "var(--success)" : "var(--danger)",
            border: `1px solid ${cleared ? "var(--success)" : "var(--danger)"}`
          }}>
          {bias.decision}
        </span>
      </div>

      <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
        Measured on out-of-fold predictions across the training data, so it is the same for every applicant.
        Gender and marital status are not model inputs; they are used only for this audit.
      </p>

      <div className="mb-5 p-4 rounded-xl" style={{ background: "var(--bg)" }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Bias Score
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Threshold: {threshold.toFixed(2)}</span>
            <span className="text-sm font-bold"
              style={{ color: cleared ? "var(--success)" : "var(--danger)" }}>
              {bias.bias_score.toFixed(3)}
            </span>
          </div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill"
            style={{
              width: `${Math.min(bias.bias_score * 100, 100)}%`,
              background: cleared ? "var(--success)" : "var(--danger)"
            }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>0 — Fair</span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>1 — Biased</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        {gaps.map((g) => (
          <div key={g.key} className="rounded-xl p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{g.label}</p>
            <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>{pct(bias.metrics?.[g.key])}</p>
            {ci[g.key] && (
              <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                95% CI {pct(ci[g.key][0])} – {pct(ci[g.key][1])}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {rates.map((r) => (
          <div key={r.label} className="rounded-xl p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              {r.label}{r.n ? ` (n=${r.n})` : ""}
            </p>
            <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>{pct(r.value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
