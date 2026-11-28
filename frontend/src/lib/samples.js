// Synthetic sample applicants, so a reviewer can run the pipeline in one click.
// Each was scored against the served v2 model when chosen: auto-approved, referred, stopped by rules.
export const SAMPLES = [
  {
    id: "strong",
    label: "Strong applicant",
    hint: "Likely auto-approved",
    data: { name: "Priya Raman", loan_amount: 280000, property_value: 350000, annual_income: 125000,
      monthly_debts: 350, loan_term: 360, loan_type: "Conventional", has_coapplicant: true,
      sex: "Female", race: "Asian", ethnicity: "Not Hispanic or Latino", age: "35-44" },
  },
  {
    id: "stretch",
    label: "Stretched budget",
    hint: "Likely referred to a loan officer",
    data: { name: "Daniel Okafor", loan_amount: 310000, property_value: 320000, annual_income: 72000,
      monthly_debts: 900, loan_term: 360, loan_type: "FHA", has_coapplicant: false,
      sex: "Male", race: "Black or African American", ethnicity: "Not Hispanic or Latino", age: "25-34" },
  },
  {
    id: "rules",
    label: "Loan above value",
    hint: "Stopped at stage 1",
    data: { name: "Mara Lindqvist", loan_amount: 420000, property_value: 400000, annual_income: 95000,
      monthly_debts: 300, loan_term: 360, loan_type: "Conventional", has_coapplicant: false,
      sex: "Not provided", race: "Not provided", ethnicity: "Not provided", age: "Not provided" },
  },
]

export const sampleById = (id) => SAMPLES.find((s) => s.id === id)
