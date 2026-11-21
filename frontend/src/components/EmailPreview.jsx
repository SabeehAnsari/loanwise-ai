import { useState } from "react"
import { Alert, Check, Clock, Copy, Mail, Product } from "./Icons"

export function EmailPreview({ email }) {
  const [copied, setCopied] = useState(false)
  if (!email) return null

  if (email.status === "HUMAN_REVIEW" || !email.body) {
    return (
      <section className="block" aria-labelledby="email-h">
        <div className="block-head">
          <h3 id="email-h" className="block-title"><span className="fig">Doc. 1</span>Decision letter</h3>
          <span className="status-line" data-tone="warn"><Clock size={15} />Held for human review</span>
        </div>
        <p className="caption" style={{ fontSize: 14.5, color: "var(--ink-2)" }}>
          The generated letter failed the guardrails {email.attempts ?? 3} times (invented rates or amounts, a
          contradicted decision, length or signature checks), so it was not sent. A person reviews it instead.
        </p>
      </section>
    )
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(email.body)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  const [letter, offers] = email.body.includes("---") ? email.body.split("---") : [email.body, null]
  const tries = email.attempts ?? 1

  return (
    <section className="block" aria-labelledby="email-h">
      <div className="block-head">
        <h3 id="email-h" className="block-title"><span className="fig">Doc. 1</span>Decision letter</h3>
        <button type="button" className="btn-secondary" onClick={handleCopy} aria-live="polite">
          {copied ? <Check size={15} /> : <Copy size={15} />}
          {copied ? "Copied" : "Copy text"}
        </button>
      </div>
      <div className="email-meta">
        <span className="status-line" data-tone="pass"><Check size={14} />Passed guardrails on attempt {tries} of 3</span>
        {email.sent
          ? <span className="status-line" data-tone="pass"><Mail size={14} />Sent to {email.recipient}</span>
          : <span className="status-line" data-tone="warn"><Alert size={14} />Not delivered by email</span>}
      </div>
      <div className="letter">
        <div className="letter-part">{letter.trim()}</div>
        {offers && (
          <div className="letter-part">
            <h4>Personalised offers</h4>
            {offers.trim()}
          </div>
        )}
      </div>
      <p className="caption">Written by gpt-4o-mini, then checked by rule-based guardrails before it could be sent.</p>
    </section>
  )
}

export function Products({ marketing }) {
  const list = marketing?.eligible_products
  if (!list) return null
  return (
    <section className="block" aria-labelledby="prod-h">
      <div className="block-head">
        <h3 id="prod-h" className="block-title"><span className="fig">Table 2</span>Eligible products</h3>
        <span className="block-meta">{marketing.product_count} matched by rules</span>
      </div>
      {list.length ? (
        <ul className="products">
          {list.map((p) => <li key={p}><Product size={18} />{p}</li>)}
        </ul>
      ) : (
        <p className="caption" style={{ fontSize: 14.5 }}>No products match this profile under the eligibility rules.</p>
      )}
    </section>
  )
}

export default EmailPreview
