// The same estimates the API makes (ml/serving.py), so the form can show them live.
// Assumptions come from the model card, the single source of truth.
import card from "./modelCard.json"

export const ASSUMPTIONS = card.assumptions

export function monthlyPayment(loanAmount, termMonths, rate = ASSUMPTIONS.interest_rate) {
  if (!(loanAmount > 0) || !(termMonths > 0)) return 0
  const r = rate / 12
  return (loanAmount * r) / (1 - (1 + r) ** -termMonths)
}

export function estimate(app) {
  const income = Number(app.annual_income) || 0
  const loan = Number(app.loan_amount) || 0
  const value = Number(app.property_value) || 0
  if (!(income > 0) || !(loan > 0) || !(value > 0)) return null
  const payment = monthlyPayment(loan, Number(app.loan_term))
  const housing = payment + (value * ASSUMPTIONS.tax_and_insurance_rate) / 12
  return {
    payment,
    housing,
    dti: (100 * ((Number(app.monthly_debts) || 0) + housing)) / (income / 12),
    ltv: (100 * loan) / value,
    downPayment: value - loan,
    conforming: loan <= ASSUMPTIONS.conforming_limit,
  }
}
