import { useState } from "react"
import { Alert, ArrowRight } from "./Icons"
import { SAMPLES } from "../lib/samples"

const EMPTY = {
  name: "", gender: 1, married: 0,
  dependents: 0, education: 1, self_employed: 0,
  applicant_income: "", coapplicant_income: "",
  loan_amount: "", loan_amount_term: 360,
  credit_history: 1, property_area: 2,
}

const TERMS = [
  [360, "360 mo · 30 yrs"], [180, "180 mo · 15 yrs"], [120, "120 mo · 10 yrs"],
  [60, "60 mo · 5 yrs"], [36, "36 mo · 3 yrs"], [12, "12 mo · 1 yr"],
]

const money = (n) => "$" + Math.round(n).toLocaleString("en-US")

function repaymentRatio(form) {
  const income = Number(form.applicant_income || 0) + Number(form.coapplicant_income || 0)
  const amount = Number(form.loan_amount || 0)
  if (!income || !amount || !form.loan_amount_term) return null
  const monthly = (amount * 1000) / form.loan_amount_term
  return { monthly, ratio: monthly / income }
}

function validate(form) {
  const e = {}
  if (form.name.trim().length < 2) e.name = "Enter the applicant's full name (at least 2 characters)."
  const income = Number(form.applicant_income)
  if (!form.applicant_income || income < 500) e.applicant_income = "Monthly income must be at least $500."
  else if (income > 1_000_000) e.applicant_income = "Monthly income must be at most $1,000,000."
  if (Number(form.coapplicant_income) < 0) e.coapplicant_income = "Co-applicant income can't be negative."
  const amount = Number(form.loan_amount)
  if (!form.loan_amount || amount < 1) e.loan_amount = "Enter a loan amount of at least 1 (that's $1,000)."
  else if (amount > 10_000) e.loan_amount = "The maximum loan is 10,000 (that's $10 million)."
  return e
}

function Field({ label, hint, error, children, className = "", htmlFor }) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={htmlFor}>{label}</label>
      {children}
      {error
        ? <p className="field-error" id={`${htmlFor}-err`}><Alert size={14} />{error}</p>
        : hint && <p className="field-hint">{hint}</p>}
    </div>
  )
}

function Segmented({ legend, name, value, options, onChange, className = "" }) {
  return (
    <fieldset className={className} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend className="field-label" style={{ padding: 0 }}>{legend}</legend>
      <div className="seg">
        {options.map(([v, text]) => (
          <label key={v}>
            <input type="radio" name={name} value={v} checked={value === v} onChange={() => onChange(name, v)} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export default function LoanForm({ onSubmit, loading, initial }) {
  const [form, setForm] = useState(initial || EMPTY)
  const [errors, setErrors] = useState({})

  const set = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }))
  }
  const onInput = (e) => {
    const { name, value, type } = e.target
    set(name, type === "number" ? (value === "" ? "" : Number(value)) : value)
  }
  const fill = (data) => { setForm(data); setErrors({}) }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length) {
      setErrors(errs)
      document.getElementById(`f-${Object.keys(errs)[0]}`)?.focus()
      return
    }
    onSubmit({
      ...form,
      name: form.name.trim(),
      applicant_income: Number(form.applicant_income),
      coapplicant_income: Number(form.coapplicant_income || 0),
      loan_amount: Number(form.loan_amount),
    })
  }

  const rr = repaymentRatio(form)
  const err = (k) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `f-${k}-err` : undefined })

  return (
    <form onSubmit={handleSubmit} noValidate className="sheet form-sheet" aria-label="Loan application">
      <div className="samples">
        <span className="samples-label">Samples:</span>
        {SAMPLES.map((s) => (
          <button key={s.id} type="button" className="chip" onClick={() => fill(s.data)}>{s.label}</button>
        ))}
      </div>

      <fieldset className="section">
        <div className="section-head"><legend className="section-title">Applicant</legend></div>
        <div className="fields">
          <Field label="Full name" error={errors.name} className="span-2" htmlFor="f-name">
            <input id="f-name" name="name" className="input" value={form.name} onChange={onInput}
              autoComplete="off" placeholder="e.g. Priya Raman" {...err("name")} />
          </Field>
          <Segmented legend="Dependents" name="dependents" value={form.dependents} onChange={set}
            options={[[0, "0"], [1, "1"], [2, "2"], [3, "3+"]]} />
          <Segmented legend="Education" name="education" value={form.education} onChange={set}
            options={[[1, "Graduate"], [0, "Not graduate"]]} />
          <Segmented legend="Employment" name="self_employed" value={form.self_employed} onChange={set}
            options={[[0, "Salaried"], [1, "Self-employed"]]} className="span-2" />
        </div>
      </fieldset>

      <fieldset className="section">
        <div className="section-head"><legend className="section-title">Finances</legend><span className="section-note">Monthly, in USD</span></div>
        <div className="fields">
          <Field label="Applicant income" error={errors.applicant_income} htmlFor="f-applicant_income">
            <div className="input-wrap">
              <span className="affix pre">$</span>
              <input id="f-applicant_income" name="applicant_income" type="number" inputMode="decimal" min="0"
                className="input has-prefix" value={form.applicant_income} onChange={onInput} placeholder="5000"
                {...err("applicant_income")} />
            </div>
          </Field>
          <Field label="Co-applicant income" error={errors.coapplicant_income} hint="Leave empty if none" htmlFor="f-coapplicant_income">
            <div className="input-wrap">
              <span className="affix pre">$</span>
              <input id="f-coapplicant_income" name="coapplicant_income" type="number" inputMode="decimal" min="0"
                className="input has-prefix" value={form.coapplicant_income} onChange={onInput} placeholder="0"
                {...err("coapplicant_income")} />
            </div>
          </Field>
          <Segmented legend="Credit history" name="credit_history" value={form.credit_history} onChange={set}
            options={[[1, "No defaults"], [0, "Has defaults"]]} className="span-2" />
          <Segmented legend="Property area" name="property_area" value={form.property_area} onChange={set}
            options={[[2, "Urban"], [1, "Semi-urban"], [0, "Rural"]]} className="span-2" />
        </div>
      </fieldset>

      <fieldset className="section">
        <div className="section-head"><legend className="section-title">Loan</legend></div>
        <div className="fields">
          <Field label="Amount" error={errors.loan_amount} htmlFor="f-loan_amount"
            hint={form.loan_amount ? `= ${money(Number(form.loan_amount) * 1000)}` : "In thousands: 128 = $128,000"}>
            <div className="input-wrap">
              <span className="affix pre">$</span>
              <input id="f-loan_amount" name="loan_amount" type="number" inputMode="decimal" min="0"
                className="input has-prefix has-suffix" value={form.loan_amount} onChange={onInput} placeholder="128"
                {...err("loan_amount")} />
              <span className="affix suf">k</span>
            </div>
          </Field>
          <Field label="Term" htmlFor="f-term">
            <select id="f-term" name="loan_amount_term" className="select" value={form.loan_amount_term}
              onChange={(e) => set("loan_amount_term", Number(e.target.value))}>
              {TERMS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Field>
          {rr && (
            <div className="span-2 ratio" data-over={rr.ratio > 0.6}>
              <span className="ratio-track" aria-hidden="true">
                <span className="ratio-fill" style={{ width: `${Math.min(rr.ratio / 0.6, 1) * 100}%` }} />
              </span>
              <span>
                Repayment {money(rr.monthly)}/mo is {(rr.ratio * 100).toFixed(1)}% of income
                {rr.ratio > 0.6 ? ", over the 60% rule, so business rules will deny it" : " (limit 60%, before interest)"}
              </span>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="section">
        <div className="section-head">
          <legend className="section-title">Fairness monitoring</legend>
          <span className="section-note">Not model inputs</span>
        </div>
        <div className="fields">
          <Segmented legend="Gender" name="gender" value={form.gender} onChange={set} options={[[1, "Male"], [0, "Female"]]} />
          <Segmented legend="Marital status" name="married" value={form.married} onChange={set} options={[[1, "Married"], [0, "Not married"]]} />
          <p className="field-hint span-2" style={{ marginTop: 0 }}>
            Used only to audit approval-rate gaps between groups. Changing them cannot change the score.
          </p>
        </div>
      </fieldset>

      <div className="submit-row">
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          <span>{loading ? "Running pipeline…" : "Run decision"}</span>
          <ArrowRight size={18} className="nudge" />
        </button>
        <p className="submit-note">The decision letter is also emailed to your account address.</p>
      </div>
    </form>
  )
}
