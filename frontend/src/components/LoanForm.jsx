import { useState } from "react"

const VALIDATION_RULES = {
  applicant_income: { min: 500, max: 1000000, message: "Monthly income must be between $500 and $1,000,000" },
  coapplicant_income: { min: 0, max: 1000000, message: "Co-applicant income must be between $0 and $1,000,000" },
  loan_amount: { min: 1, max: 10000, message: "Loan amount must be between $1,000 and $10,000,000" }
}

function Field({ label, children, error }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{error}</p>}
    </div>
  )
}

export default function LoanForm({ onSubmit, loading }) {
  const [form, setForm] = useState({
    name: "", gender: 1, married: 0,
    dependents: 0, education: 1, self_employed: 0,
    applicant_income: "", coapplicant_income: 0,
    loan_amount: "", loan_amount_term: 360,
    credit_history: 1.0, property_area: 2
  })
  const [errors, setErrors] = useState({})

  const handle = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: isNaN(value) || value === "" ? value : Number(value) }))
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Full name is required (min 2 characters)"
    if (!form.applicant_income || form.applicant_income < 500) e.applicant_income = VALIDATION_RULES.applicant_income.message
    if (form.coapplicant_income < 0) e.coapplicant_income = "Cannot be negative"
    if (!form.loan_amount || form.loan_amount < 1) e.loan_amount = VALIDATION_RULES.loan_amount.message
    else if (form.loan_amount > 10000) e.loan_amount = VALIDATION_RULES.loan_amount.message
    if (form.applicant_income && form.loan_amount && form.loan_amount_term) {
      const totalIncome = Number(form.applicant_income) + Number(form.coapplicant_income)
      const dti = (form.loan_amount * 1000) / form.loan_amount_term / totalIncome
      if (dti > 0.60) e.loan_amount = `Debt-to-income ratio is ${(dti * 100).toFixed(1)}% — max allowed is 60%`
    }
    return e
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    onSubmit(form)
  }

  const inputStyle = (field) => ({
    width: "100%",
    background: "var(--surface)",
    border: `1.5px solid ${errors[field] ? "var(--danger)" : "var(--border)"}`,
    color: "var(--text-primary)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none",
    boxShadow: errors[field] ? "0 0 0 3px rgba(230,57,70,0.10)" : "none"
  })

  const selectStyle = {
    width: "100%",
    background: "var(--surface)",
    border: "1.5px solid var(--border)",
    color: "var(--text-primary)",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    outline: "none"
  }

  return (
    <div className="card card-accent-blue p-6">
      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">

        <Field label="Full Name" name="name" error={errors.name}>
          <input name="name" value={form.name} onChange={handle}
            placeholder="John Smith" style={inputStyle("name")} />
        </Field>

        <Field label="Gender">
          <select name="gender" value={form.gender} onChange={handle} style={selectStyle}>
            <option value={1}>Male</option>
            <option value={0}>Female</option>
          </select>
        </Field>

        <Field label="Marital Status">
          <select name="married" value={form.married} onChange={handle} style={selectStyle}>
            <option value={1}>Married</option>
            <option value={0}>Not Married</option>
          </select>
        </Field>

        <Field label="Dependents">
          <select name="dependents" value={form.dependents} onChange={handle} style={selectStyle}>
            {[0,1,2,3].map(n => <option key={n} value={n}>{n}{n===3?"+":" "}</option>)}
          </select>
        </Field>

        <Field label="Education">
          <select name="education" value={form.education} onChange={handle} style={selectStyle}>
            <option value={1}>Graduate</option>
            <option value={0}>Not Graduate</option>
          </select>
        </Field>

        <Field label="Employment Type">
          <select name="self_employed" value={form.self_employed} onChange={handle} style={selectStyle}>
            <option value={0}>Salaried</option>
            <option value={1}>Self-Employed</option>
          </select>
        </Field>

        <Field label="Property Area">
          <select name="property_area" value={form.property_area} onChange={handle} style={selectStyle}>
            <option value={2}>Urban</option>
            <option value={1}>Semiurban</option>
            <option value={0}>Rural</option>
          </select>
        </Field>

        <Field label="Monthly Income ($)" error={errors.applicant_income}>
          <input name="applicant_income" value={form.applicant_income} onChange={handle}
            type="number" placeholder="5,000" style={inputStyle("applicant_income")} />
        </Field>

        <Field label="Co-applicant Income ($)" error={errors.coapplicant_income}>
          <input name="coapplicant_income" value={form.coapplicant_income} onChange={handle}
            type="number" placeholder="0" style={inputStyle("coapplicant_income")} />
        </Field>

        <Field label="Loan Amount ($ thousands)" error={errors.loan_amount}>
          <input name="loan_amount" value={form.loan_amount} onChange={handle}
            type="number" placeholder="128" style={inputStyle("loan_amount")} />
        </Field>

        <Field label="Loan Term">
          <select name="loan_amount_term" value={form.loan_amount_term} onChange={handle} style={selectStyle}>
            <option value={360}>360 months (30 years)</option>
            <option value={180}>180 months (15 years)</option>
            <option value={120}>120 months (10 years)</option>
            <option value={60}>60 months (5 years)</option>
            <option value={36}>36 months (3 years)</option>
            <option value={12}>12 months (1 year)</option>
          </select>
        </Field>

        <div className="md:col-span-2">
          <Field label="Credit History">
            <select name="credit_history" value={form.credit_history} onChange={handle} style={selectStyle}>
              <option value={1.0}>Good — No defaults on record</option>
              <option value={0.0}>Poor — Has defaults on record</option>
            </select>
          </Field>
        </div>

        <div className="md:col-span-2 pt-2">
          <button type="submit" disabled={loading}
            className="btn-primary w-full py-3 rounded-xl text-sm">
            {loading ? "Processing Application..." : "Submit Application →"}
          </button>
        </div>

      </form>
    </div>
  )
}