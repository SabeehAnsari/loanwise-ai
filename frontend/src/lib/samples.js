// Synthetic sample applicants, so a reviewer can run the pipeline in one click.
export const SAMPLES = [
  {
    id: "strong",
    label: "Strong applicant",
    hint: "Likely approved",
    data: { name: "Priya Raman", gender: 0, married: 1, dependents: 1, education: 1, self_employed: 0,
      applicant_income: 5400, coapplicant_income: 1800, loan_amount: 128, loan_amount_term: 360,
      credit_history: 1, property_area: 2 },
  },
  {
    id: "defaults",
    label: "Prior defaults",
    hint: "Likely denied",
    data: { name: "Daniel Okafor", gender: 1, married: 0, dependents: 2, education: 0, self_employed: 1,
      applicant_income: 3100, coapplicant_income: 0, loan_amount: 160, loan_amount_term: 360,
      credit_history: 0, property_area: 0 },
  },
  {
    id: "rules",
    label: "Fails rules",
    hint: "Stopped at stage 1",
    data: { name: "Mara Lindqvist", gender: 0, married: 0, dependents: 0, education: 1, self_employed: 0,
      applicant_income: 2200, coapplicant_income: 0, loan_amount: 300, loan_amount_term: 120,
      credit_history: 1, property_area: 1 },
  },
]

export const sampleById = (id) => SAMPLES.find((s) => s.id === id)
