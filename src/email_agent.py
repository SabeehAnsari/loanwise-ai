from openai import OpenAI
import os
import re
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def generate_loan_email(applicant_data: dict, prediction: int) -> str:
    """
    Generates a personalized loan decision email using OpenAI.

    Parameters:
        applicant_data : dict of applicant features
        prediction     : 0 (denied) or 1 (approved)

    Returns:
        str: the generated email text
    """
    decision_text = "APPROVED" if prediction == 1 else "DENIED"

    prompt = f"""
You are a professional loan officer at a financial institution.
Write a formal, empathetic email to a loan applicant informing them 
of their loan decision.

APPLICANT DETAILS:
- Applicant Name: {applicant_data.get('name', 'Valued Customer')}
- Loan Amount Requested: ${applicant_data.get('loan_amount', 'N/A')} thousand
- Loan Term: {applicant_data.get('loan_term', 'N/A')} months
- Employment: {'Self-Employed' if applicant_data.get('self_employed') == 1 else 'Salaried'}
- Education: {'Graduate' if applicant_data.get('education') == 1 else 'Not Graduate'}
- Credit History: {'Good' if applicant_data.get('credit_history') == 1.0 else 'Poor'}
- Property Area: {applicant_data.get('property_area', 'N/A')}

DECISION: {decision_text}

STRICT RULES YOU MUST FOLLOW:
1. Do NOT invent or mention any specific interest rates
2. Do NOT invent any repayment schedules or monthly payment amounts
3. Do NOT make any promises beyond the decision stated above
4. Do NOT mention any fees, charges, or penalties not provided
5. Keep the email under 200 words
6. Use a professional, empathetic tone
7. End with next steps appropriate to the decision
8. Address the applicant by name
9. Sign off as "The LoanWise AI Team"

Write only the email — no subject line, no extra commentary.
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        max_tokens=500,
        messages=[
            {
                "role": "system",
                "content": "You are a professional loan officer writing formal customer emails."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    return response.choices[0].message.content


def validate_email(email_text: str, applicant_data: dict) -> dict:
    """
    Checks the generated email against guardrail rules.

    Returns:
        dict with 'passed' (bool), 'violations' (list), and 'word_count' (int)
    """
    violations = []

    # Guardrail 1: No invented interest rates
    interest_patterns = [
        r'\d+\.?\d*\s*%\s*(interest|rate|APR|per annum)',
        r'(interest|rate)\s+of\s+\d+\.?\d*\s*%',
        r'APR\s+of\s+\d+'
    ]
    for pattern in interest_patterns:
        if re.search(pattern, email_text, re.IGNORECASE):
            violations.append("GUARDRAIL FAILED: Email contains invented interest rate")
            break

    # Guardrail 2: No invented payment amounts
    payment_patterns = [
        r'monthly\s+payment\s+of\s+\$[\d,]+',
        r'pay\s+\$[\d,]+\s+per\s+month',
        r'installment\s+of\s+\$[\d,]+'
    ]
    for pattern in payment_patterns:
        if re.search(pattern, email_text, re.IGNORECASE):
            violations.append("GUARDRAIL FAILED: Email contains invented payment amount")
            break

    # Guardrail 3: Email not too long
    word_count = len(email_text.split())
    if word_count > 300:
        violations.append(f"GUARDRAIL FAILED: Email too long ({word_count} words, max 300)")

    # Guardrail 4: Correct decision mentioned
    decision_word = "approved" if applicant_data.get('prediction') == 1 else "denied"
    opposite_word = "denied" if applicant_data.get('prediction') == 1 else "approved"
    if (opposite_word.lower() in email_text.lower() and
            decision_word.lower() not in email_text.lower()):
        violations.append("GUARDRAIL FAILED: Email mentions wrong decision")

    # Guardrail 5: Must be signed by LoanWise AI Team
    if "loanwise" not in email_text.lower():
        violations.append("GUARDRAIL FAILED: Missing required signature")

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "word_count": word_count
    }


def generate_validated_email(applicant_data: dict, prediction: int, max_retries: int = 3) -> dict:
    """
    Full pipeline: generate email → validate → retry if needed.

    Parameters:
        applicant_data : dict of applicant features
        prediction     : 0 (denied) or 1 (approved)
        max_retries    : number of attempts before escalating to human review

    Returns:
        dict with status, email text, attempt count, and validation result
    """
    applicant_data['prediction'] = prediction

    for attempt in range(1, max_retries + 1):
        email_text = generate_loan_email(applicant_data, prediction)
        validation = validate_email(email_text, applicant_data)

        if validation['passed']:
            return {
                "status": "SENT",
                "email": email_text,
                "attempts": attempt,
                "validation": validation
            }

    # All attempts failed — escalate to human review
    return {
        "status": "HUMAN_REVIEW",
        "email": None,
        "attempts": max_retries,
        "validation": validation
    }