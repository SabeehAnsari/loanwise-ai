from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client

# LoanWise's own (demo) mortgage catalogue. Eligibility is decided by these rules, never by the LLM.
# Every applicant dict here carries the estimated "dti" and "ltv" (percent) from ml.serving.derived.
LOAN_PRODUCTS = [
    {"name": "Rate lock (60 days)",
     "description": "Fix today's rate while the purchase completes",
     "suitable_for": "Approved applicants about to close",
     "rule": lambda a, d: d == "APPROVED"},
    {"name": "15-year fixed-rate mortgage",
     "description": "Shorter term, less total interest",
     "suitable_for": "Applicants with low existing debt",
     "rule": lambda a, d: a["dti"] <= 36 and a["ltv"] <= 90},
    {"name": "FHA-insured mortgage",
     "description": "Government-insured option with a smaller down payment",
     "suitable_for": "Buyers with a small deposit",
     "rule": lambda a, d: a["ltv"] > 90 and a["loan_type"] != "FHA"},
    {"name": "Home-buyer education course",
     "description": "A short course on budgeting and the mortgage process",
     "suitable_for": "Applicants whose application is under review or with high debt",
     "rule": lambda a, d: d == "REFERRED" or a["dti"] > 43},
    {"name": "Debt consolidation review",
     "description": "A conversation about lowering monthly debt payments",
     "suitable_for": "Applicants whose existing debts are a large share of income",
     "rule": lambda a, d: a["monthly_debts"] * 12 > 0.2 * a["annual_income"]},
]


def get_eligible_products(applicant_data: dict, decision: str) -> list:
    """
    Filter the catalogue with hard rules. This runs BEFORE the LLM, which only writes
    the recommendation text: it never decides who is eligible.
    """
    return [p for p in LOAN_PRODUCTS if p["rule"](applicant_data, decision)]


def generate_recommendations(applicant_data: dict, eligible_products: list, decision: str) -> str:
    """
    Uses OpenAI to write personalized recommendation text
    based on the rule-filtered eligible products.
    """
    if not eligible_products:
        return ""

    products_text = "\n".join([
        f"- {p['name']}: {p['description']} (suitable for: {p['suitable_for']})"
        for p in eligible_products
    ])

    decision_context = (
        "approved for their mortgage"
        if decision == "APPROVED"
        else "waiting for a loan officer to review their mortgage application"
    )

    prompt = f"""
You are a helpful financial advisor at LoanWise.
The applicant has been {decision_context}.

Based on their profile, they are eligible for the following products:
{products_text}

APPLICANT PROFILE:
- Loan type requested: {applicant_data.get('loan_type', 'N/A')}
- Loan term: {applicant_data.get('loan_term', 'N/A')} months

Write a short, friendly paragraph (max 100 words) recommending these products.
- Mention each eligible product by name
- Explain briefly why each suits their profile
- Keep the tone warm and helpful
- Do NOT mention any rates, fees, or specific amounts
- End with "Contact us to learn more about any of these options."
- Write ONLY the recommendation paragraph, nothing else
"""

    response = get_client().chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=300,
        messages=[
            {
                "role": "system",
                "content": "You are a helpful financial advisor writing personalized product recommendations."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    return response.choices[0].message.content


def run_marketing_agent(applicant_data: dict, decision: str) -> dict:
    """
    Full marketing agent pipeline:
    1. Filter eligible products by hard rules
    2. Generate personalized recommendation text via LLM
    3. Return recommendations to be appended to the decision email

    Parameters:
        applicant_data : dict of applicant features
        decision       : "APPROVED" or "REFERRED"

    Returns:
        dict with eligible_products, recommendation_text, and product_count
    """
    eligible_products = get_eligible_products(applicant_data, decision)

    if not eligible_products:
        return {
            "eligible_products": [],
            "recommendation_text": "",
            "product_count": 0
        }

    recommendation_text = generate_recommendations(
        applicant_data, eligible_products, decision
    )

    return {
        "eligible_products": [p['name'] for p in eligible_products],
        "recommendation_text": recommendation_text,
        "product_count": len(eligible_products)
    }


def build_final_email(email_text: str, recommendation_text: str) -> str:
    if not recommendation_text:
        return email_text

    return f"""{email_text}

---

{recommendation_text}
"""