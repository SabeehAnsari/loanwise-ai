export default function BiasReport({ bias }) {
  if (!bias) return null
  const cleared = bias.decision === "CLEARED"

  return (
    <div className={`card ${cleared ? "card-accent-green" : "card-accent-red"} p-6`}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}>Bias Detection Report</p>
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

      <div className="mb-5 p-4 rounded-xl" style={{ background: "var(--bg)" }}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Bias Score
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>Threshold: 0.20</span>
            <span className="text-sm font-bold"
              style={{ color: cleared ? "var(--success)" : "var(--danger)" }}>
              {bias.bias_score.toFixed(4)}
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

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Gender Disparity", value: bias.metrics?.gender_disparity },
          { label: "Marital Disparity", value: bias.metrics?.married_disparity },
          { label: "FNR Disparity", value: bias.metrics?.fnr_disparity },
          { label: "Male Approval Rate", value: bias.metrics?.male_approval_rate },
          { label: "Female Approval Rate", value: bias.metrics?.female_approval_rate },
          { label: "Married Approval Rate", value: bias.metrics?.married_approval_rate },
        ].map((m, i) => (
          <div key={i} className="rounded-xl p-3" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
            <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>{m.label}</p>
            <p className="text-sm font-bold" style={{ color: "var(--navy)" }}>
              {m.value != null ? (m.value * 100).toFixed(2) + "%" : "N/A"}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}