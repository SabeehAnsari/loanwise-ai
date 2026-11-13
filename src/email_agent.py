from openai import OpenAI
import os
import re
from dotenv import load_dotenv

load_dotenv()

_client = None


def get_client() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


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
7. State the decision explicitly in the first paragraph ("approved" or "not approved")
8. End with next steps appropriate to the decision
9. Address the applicant by name
10. Sign off as "The LoanWise AI Team"

Write only the email — no subject line, no extra commentary.
"""

    response = get_client().chat.completions.create(
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


# Phrases that state a denial, including negated forms of "approve".
_DENIAL_PATTERNS = [
    r"\bdenied\b",
    r"\bdeclined\b",
    r"\bunsuccessful\b",
    r"\bregret to inform\b",
    r"(?:\bnot|n't|\bnever)\s+(?:been\s+|be\s+)?approved\b",
    r"\b(?:unable|not able|cannot|can't|could not|couldn't)\s+(?:to\s+)?approve\b",
    r"\bnot\s+in\s+a\s+position\s+to\s+approve\b",
]
_NEGATED_APPROVED = r"(?:\bnot|n't|\bnever)\s+(?:been\s+|be\s+)?approved\b"


def mentions_approval(text: str) -> bool:
    """True if the text states an approval ("approved" not negated, or congratulations)."""
    approved = len(re.findall(r"\bapproved\b", text, re.IGNORECASE))
    negated = len(re.findall(_NEGATED_APPROVED, text, re.IGNORECASE))
    return approved > negated or bool(re.search(r"\bcongratulat", text, re.IGNORECASE))


def mentions_denial(text: str) -> bool:
    return any(re.search(p, text, re.IGNORECASE) for p in _DENIAL_PATTERNS)


def validate_email(email_text: str, prediction: int) -> dict:
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

    # Guardrail 4: The email must state the actual decision, and not the opposite one
    approval, denial = mentions_approval(email_text), mentions_denial(email_text)
    if prediction == 1 and (denial or not approval):
        violations.append("GUARDRAIL FAILED: Email does not clearly state the approval")
    if prediction == 0 and (approval or not denial):
        violations.append("GUARDRAIL FAILED: Email does not clearly state the denial")

    # Guardrail 5: Must be signed by LoanWise AI Team
    if "loanwise" not in email_text.lower():
        violations.append("GUARDRAIL FAILED: Missing required signature")

    return {
        "passed": len(violations) == 0,
        "violations": violations,
        "word_count": word_count
    }


def generate_validated_email(applicant_data: dict, prediction: int, max_retries: int = 3,
                             generate=None) -> dict:
    """
    Full pipeline: generate email → validate → retry if needed.

    Parameters:
        applicant_data : dict of applicant features
        prediction     : 0 (denied) or 1 (approved)
        max_retries    : number of attempts before escalating to human review
        generate       : email generator (defaults to the OpenAI-backed one; injectable for tests)

    Returns:
        dict with status, email text, attempt count, and validation result
    """
    generate = generate or generate_loan_email
    validation = None

    for attempt in range(1, max_retries + 1):
        email_text = generate(applicant_data, prediction)
        validation = validate_email(email_text, prediction)

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
