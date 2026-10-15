from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

LOAN_PRODUCTS = [
    {
        "name": "Personal Loan",
        "description": "Unsecured personal loan for any purpose",
        "min_income": 2500,
        "max_loan": 50,
        "requires_credit_history": False,
        "suitable_for": "Anyone with stable income"
    },
    {
        "name": "Home Improvement Loan",
        "description": "Loan specifically for property renovation",
        "min_income": 4000,
        "max_loan": 150,
        "requires_credit_history": True,
        "suitable_for": "Property owners with good credit"
    },
    {
        "name": "Education Loan",
        "description": "Loan for higher education expenses",
        "min_income": 2000,
        "max_loan": 80,
        "requires_credit_history": False,
        "suitable_for": "Students or parents funding education"
    },
    {
        "name": "Business Loan",
        "description": "Loan for self-employed business owners",
        "min_income": 5000,
        "max_loan": 200,
        "requires_credit_history": True,
        "suitable_for": "Self-employed applicants with good credit"
    },
    {
        "name": "Secured Loan",
        "description": "Loan backed by collateral for lower risk",
        "min_income": 1500,
        "max_loan": 100,
        "requires_credit_history": False,
        "suitable_for": "Applicants with poor credit but assets"
    }
]


def get_eligible_products(applicant_data: dict) -> list:
    """
    Filters loan products based on hard eligibility rules.
    This runs BEFORE the LLM to reduce hallucination risk.
    The LLM only writes recommendations — it never decides eligibility.
    """
    eligible = []
    total_income = applicant_data.get('total_income', 0)
    credit_history = applicant_data.get('credit_history', 0)

    for product in LOAN_PRODUCTS:
        if total_income < product['min_income']:
            continue
        if product['requires_credit_history'] and credit_history != 1.0:
            continue
        eligible.append(product)

    return eligible


def generate_recommendations(applicant_data: dict, eligible_products: list, prediction: int) -> str:
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
        "approved for their requested loan"
        if prediction == 1
        else "not approved for their requested loan at this time"
    )

    prompt = f"""
You are a helpful financial advisor at LoanWise.
The applicant has been {decision_context}.

Based on their profile, they are eligible for the following products:
{products_text}

APPLICANT PROFILE:
- Total Monthly Income: ${applicant_data.get('total_income', 'N/A')}
- Credit History: {'Good' if applicant_data.get('credit_history') == 1.0 else 'Poor'}
- Employment: {'Self-Employed' if applicant_data.get('self_employed') == 1 else 'Salaried'}
- Education: {'Graduate' if applicant_data.get('education') == 1 else 'Not Graduate'}

Write a short, friendly paragraph (max 100 words) recommending these products.
- Mention each eligible product by name
- Explain briefly why each suits their profile
- Keep the tone warm and helpful
- Do NOT mention any rates, fees, or specific amounts
- End with "Contact us to learn more about any of these options."
- Write ONLY the recommendation paragraph, nothing else
"""

    response = client.chat.completions.create(
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


def run_marketing_agent(applicant_data: dict, prediction: int) -> dict:
    """
    Full marketing agent pipeline:
    1. Filter eligible products by hard rules
    2. Generate personalized recommendation text via LLM
    3. Return recommendations to be appended to the decision email

    Parameters:
        applicant_data : dict of applicant features
        prediction     : 0 (denied) or 1 (approved)

    Returns:
        dict with eligible_products, recommendation_text, and product_count
    """
    eligible_products = get_eligible_products(applicant_data)

    if not eligible_products:
        return {
            "eligible_products": [],
            "recommendation_text": "",
            "product_count": 0
        }

    recommendation_text = generate_recommendations(
        applicant_data, eligible_products, prediction
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