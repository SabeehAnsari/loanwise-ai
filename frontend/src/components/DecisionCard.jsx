export default function DecisionCard({ result }) {
  const approved = result.decision === "APPROVED"
  const review = result.status === "HUMAN_REVIEW"
  const rejected = result.status === "REJECTED_BY_RULES"
  const hasProbability = typeof result.probability === "number"
  const maxImpact = Math.max(...(result.explanation || []).map(f => Math.abs(f.impact)), 1e-6)

  const config = rejected
    ? { bg: "var(--warning-light)", border: "var(--warning)", text: "var(--warning)", label: "REJECTED", accent: "card-accent-warning" }
    : review
      ? { bg: "#FFFBEB", border: "var(--warning)", text: "var(--warning)", label: "UNDER REVIEW", accent: "card-accent-warning" }
      : approved
        ? { bg: "var(--success-light)", border: "var(--success)", text: "var(--success)", label: "APPROVED", accent: "card-accent-green" }
        : { bg: "var(--danger-light)", border: "var(--danger)", text: "var(--danger)", label: "DENIED", accent: "card-accent-red" }

  return (
    <div className={`card ${config.accent} p-6`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "var(--text-muted)" }}>Loan Decision</p>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full"
              style={{ background: config.text }} />
            <span className="text-3xl font-bold" style={{ color: config.text, fontFamily: "'Playfair Display', serif" }}>
              {config.label}
            </span>
          </div>
          {result.message && (
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              {result.message}
            </p>
          )}
        </div>

        {hasProbability && (
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: "var(--text-muted)" }}>Approval Probability</p>
            <p className="text-3xl font-bold" style={{ color: config.text, fontFamily: "'Playfair Display', serif" }}>
              {(result.probability * 100).toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      {hasProbability && (
        <div className="mt-5">
          <div className="progress-bar">
            <div className="progress-fill"
              style={{ width: `${result.probability * 100}%`, background: config.text }} />
          </div>
        </div>
      )}

      {result.explanation?.length > 0 && (
        <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}>
            Key Factors
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--text-muted)" }}>
            What moved this decision most (SHAP contributions)
          </p>
          <ul className="space-y-2">
            {result.explanation.map((f) => {
              const positive = f.direction === "positive"
              const width = Math.min(Math.abs(f.impact) / maxImpact * 100, 100)
              return (
                <li key={f.feature} className="flex items-center gap-3 text-sm">
                  <span className="w-36 sm:w-48 shrink-0" style={{ color: "var(--text-secondary)" }}>{f.label}</span>
                  <div className="flex-1 progress-bar">
                    <div className="progress-fill"
                      style={{ width: `${width}%`, background: positive ? "var(--success)" : "var(--danger)" }} />
                  </div>
                  <span className="w-20 text-right text-xs font-medium"
                    style={{ color: positive ? "var(--success)" : "var(--danger)" }}>
                    {positive ? "▲ helps" : "▼ hurts"}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {result.marketing?.eligible_products?.length > 0 && (
        <div className="mt-5 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--text-muted)" }}>
            Eligible Products ({result.marketing.product_count})
          </p>
          <div className="flex flex-wrap gap-2">
            {result.marketing.eligible_products.map((p, i) => (
              <span key={i} className="text-xs px-3 py-1 rounded-full font-medium"
                style={{ background: "var(--accent-light)", color: "var(--accent)", border: "1px solid #C7DEFF" }}>
                {p}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}