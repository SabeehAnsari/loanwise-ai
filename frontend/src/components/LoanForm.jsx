import { useState } from "react"
import { Alert, ArrowRight } from "./Icons"
import { SAMPLES } from "../lib/samples"
import { ASSUMPTIONS, estimate } from "../lib/mortgage"

const EMPTY = {
  name: "", property_value: "", loan_amount: "", loan_term: 360, loan_type: "Conventional",
  annual_income: "", monthly_debts: "", has_coapplicant: false,
  sex: "Not provided", race: "Not provided", ethnicity: "Not provided", age: "Not provided",
}

const TERMS = [[360, "30 years"], [240, "20 years"], [180, "15 years"], [120, "10 years"]]
const RACES = ["Not provided", "White", "Black or African American", "Asian", "American Indian or Alaska Native",
  "Native Hawaiian or Other Pacific Islander", "Two or more races"]
const AGES = ["Not provided", "<25", "25-34", "35-44", "45-54", "55-64", "65-74", ">74"]
const LIMITS = { ltv: 100, dti: 60 }

const money = (n) => "$" + Math.round(n).toLocaleString("en-US")

function validate(form) {
  const e = {}
  if (form.name.trim().length < 2) e.name = "Enter the applicant's full name (at least 2 characters)."
  if (!(Number(form.property_value) > 0)) e.property_value = "Enter the property's price or value."
  if (!(Number(form.loan_amount) > 0)) e.loan_amount = "Enter how much you want to borrow."
  else if (Number(form.loan_amount) > 10_000_000) e.loan_amount = "The maximum loan is $10,000,000."
  if (form.annual_income === "" || Number(form.annual_income) < 0) e.annual_income = "Enter household income before tax (0 or more)."
  if (Number(form.monthly_debts) < 0) e.monthly_debts = "Monthly debts can't be negative."
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
          <label key={String(v)}>
            <input type="radio" name={name} value={String(v)} checked={value === v} onChange={() => onChange(name, v)} />
            <span>{text}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Money({ id, name, value, onChange, placeholder, suffix, ...rest }) {
  return (
    <div className="input-wrap">
      <span className="affix pre">$</span>
      <input id={id} name={name} type="number" inputMode="decimal" min="0"
        className={`input has-prefix${suffix ? " has-suffix" : ""}`} value={value} onChange={onChange}
        placeholder={placeholder} {...rest} />
      {suffix && <span className="affix suf">{suffix}</span>}
    </div>
  )
}

function Meter({ label, value, limit, text }) {
  const over = value > limit
  return (
    <div className="ratio" data-over={over}>
      <span className="ratio-track" aria-hidden="true">
        <span className="ratio-fill" style={{ width: `${Math.min(value / limit, 1) * 100}%` }} />
      </span>
      <span>{label} <b>{value.toFixed(1)}%</b> {text}{over ? `, over the ${limit}% rule, so business rules will deny it` : ` (rule limit ${limit}%)`}</span>
    </div>
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
  const onSelect = (e) => set(e.target.name, e.target.name === "loan_term" ? Number(e.target.value) : e.target.value)
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
      property_value: Number(form.property_value),
      loan_amount: Number(form.loan_amount),
      annual_income: Number(form.annual_income),
      monthly_debts: Number(form.monthly_debts || 0),
    })
  }

  const est = estimate(form)
  const err = (k) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `f-${k}-err` : undefined })

  return (
    <form onSubmit={handleSubmit} noValidate className="sheet form-sheet" aria-label="Mortgage application">
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
          <Segmented legend="Co-applicant" name="has_coapplicant" value={form.has_coapplicant} onChange={set}
            options={[[false, "Applying alone"], [true, "With a co-applicant"]]} className="span-2" />
        </div>
      </fieldset>

      <fieldset className="section">
        <div className="section-head"><legend className="section-title">Home and loan</legend><span className="section-note">USD</span></div>
        <div className="fields">
          <Field label="Property value" error={errors.property_value} htmlFor="f-property_value">
            <Money id="f-property_value" name="property_value" value={form.property_value} onChange={onInput}
              placeholder="350000" {...err("property_value")} />
          </Field>
          <Field label="Loan amount" error={errors.loan_amount} htmlFor="f-loan_amount"
            hint={est ? `Down payment ${money(est.downPayment)}` : "How much you want to borrow"}>
            <Money id="f-loan_amount" name="loan_amount" value={form.loan_amount} onChange={onInput}
              placeholder="280000" {...err("loan_amount")} />
          </Field>
          <Field label="Term" htmlFor="f-term">
            <select id="f-term" name="loan_term" className="select" value={form.loan_term} onChange={onSelect}>
              {TERMS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
          </Field>
          <Field label="Loan type" htmlFor="f-loan_type">
            <select id="f-loan_type" name="loan_type" className="select" value={form.loan_type} onChange={onSelect}>
              <option value="Conventional">Conventional</option>
              <option value="FHA">FHA</option>
              <option value="VA">VA</option>
              <option value="USDA">USDA</option>
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="section">
        <div className="section-head"><legend className="section-title">Finances</legend><span className="section-note">Before tax</span></div>
        <div className="fields">
          <Field label="Household income" error={errors.annual_income} hint="Yearly, all applicants" htmlFor="f-annual_income">
            <Money id="f-annual_income" name="annual_income" value={form.annual_income} onChange={onInput}
              placeholder="95000" suffix="/yr" {...err("annual_income")} />
          </Field>
          <Field label="Existing debt payments" error={errors.monthly_debts} hint="Car, cards, student loans" htmlFor="f-monthly_debts">
            <Money id="f-monthly_debts" name="monthly_debts" value={form.monthly_debts} onChange={onInput}
              placeholder="0" suffix="/mo" {...err("monthly_debts")} />
          </Field>
          {est && (
            <div className="span-2" style={{ display: "grid", gap: 4 }}>
              <Meter label="Loan-to-value" value={est.ltv} limit={LIMITS.ltv} text="" />
              <Meter label="Debt-to-income" value={est.dti} limit={LIMITS.dti}
                text={`(incl. about ${money(est.housing)}/mo housing)`} />
              <p className="field-hint" style={{ marginTop: 2 }}>
                Payment estimated at {(ASSUMPTIONS.interest_rate * 100).toFixed(1)}% plus
                {" "}{(ASSUMPTIONS.tax_and_insurance_rate * 100).toFixed(1)}% a year for tax and insurance.
                {!est.conforming && " Above the conforming loan limit (a jumbo loan)."}
              </p>
            </div>
          )}
        </div>
      </fieldset>

      <fieldset className="section">
        <div className="section-head">
          <legend className="section-title">Fairness monitoring</legend>
          <span className="section-note">Optional · not model inputs</span>
        </div>
        <div className="fields">
          <Field label="Sex" htmlFor="f-sex">
            <select id="f-sex" name="sex" className="select" value={form.sex} onChange={onSelect}>
              {["Not provided", "Female", "Male"].map((v) => <option key={v} value={v}>{v === "Not provided" ? "Prefer not to say" : v}</option>)}
            </select>
          </Field>
          <Field label="Age" htmlFor="f-age">
            <select id="f-age" name="age" className="select" value={form.age} onChange={onSelect}>
              {AGES.map((v) => <option key={v} value={v}>{v === "Not provided" ? "Prefer not to say" : v}</option>)}
            </select>
          </Field>
          <Field label="Race" htmlFor="f-race">
            <select id="f-race" name="race" className="select" value={form.race} onChange={onSelect}>
              {RACES.map((v) => <option key={v} value={v}>{v === "Not provided" ? "Prefer not to say" : v}</option>)}
            </select>
          </Field>
          <Field label="Ethnicity" htmlFor="f-ethnicity">
            <select id="f-ethnicity" name="ethnicity" className="select" value={form.ethnicity} onChange={onSelect}>
              {["Not provided", "Hispanic or Latino", "Not Hispanic or Latino"].map((v) => <option key={v} value={v}>{v === "Not provided" ? "Prefer not to say" : v}</option>)}
            </select>
          </Field>
          <p className="field-hint span-2" style={{ marginTop: 0 }}>
            Used only to audit outcomes between groups, the way US lenders report them. Changing them cannot change the score.
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
