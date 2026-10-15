import { useState } from "react"

export default function EmailPreview({ email }) {
  const [copied, setCopied] = useState(false)
  if (!email || !email.body) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(email.body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const parts = email.body.includes("---") ? email.body.split("---") : [email.body, null]
  const [decisionEmail, marketingEmail] = parts

  return (
    <div className="card card-accent-navy p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: "var(--text-muted)" }}>Generated Communication</p>
          <h3 className="text-lg font-bold" style={{ color: "var(--navy)" }}>
            Applicant Email
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              Passed guardrails in {email.attempts} attempt{email.attempts > 1 ? "s" : ""}
            </span>
            {email.sent && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: "var(--success-light)", color: "var(--success)" }}>
                ✓ Delivered to {email.recipient}
              </span>
            )}
          </div>
        </div>
        <button onClick={handleCopy}
          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={{
            background: copied ? "var(--success-light)" : "var(--bg)",
            color: copied ? "var(--success)" : "var(--text-secondary)",
            border: "1px solid var(--border)"
          }}>
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>

      <div className="rounded-xl p-5 mb-4" style={{ background: "var(--bg)", border: "1px solid var(--border)" }}>
        <p className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--text-muted)" }}>Decision Letter</p>
        <p className="text-sm leading-relaxed whitespace-pre-wrap"
          style={{ color: "var(--text-secondary)", fontFamily: "Georgia, serif" }}>
          {decisionEmail?.trim()}
        </p>
      </div>

      {marketingEmail && (
        <div className="rounded-xl p-5"
          style={{ background: "var(--accent-light)", border: "1px solid #C7DEFF" }}>
          <p className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "var(--accent)" }}>Personalized Offers</p>
          <p className="text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--text-secondary)" }}>
            {marketingEmail?.trim()}
          </p>
        </div>
      )}
    </div>
  )
}