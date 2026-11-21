# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: reviewers of a portfolio project, such as master's admissions committees, recruiters and engineers. They open the demo, sign in, submit one or two sample applications and judge whether the engineering is credible: the model, its explanations, the fairness audit and the LLM guardrails. They spend minutes, not hours, and are often on a laptop.

Secondary (the role the app plays): a loan officer entering an application and reading the automated decision.

## Product Purpose

LoanWise AI is an educational, end-to-end loan decisioning demo. One application passes through a pipeline: hard business rules → XGBoost scoring with per-applicant SHAP factors → a model-level fairness gate → an LLM-written decision email validated by guardrails (max 3 attempts, then human review) → rule-based product eligibility → email delivery (Resend) → storage (Supabase). Success means a reviewer understands the pipeline and trusts that every number shown is real.

## Positioning

The interesting part is not "AI approves loans". It is that every automated decision is explained (SHAP), audited (out-of-fold fairness gaps with bootstrap CIs that switch automation off on failure) and constrained (business rules before the model, guardrails on LLM output, escalation to human review).

## Operating Context

- Single-page React 19 + Vite + Tailwind 4 frontend, with Supabase email/password auth and a FastAPI backend at `POST /predict`.
- Outcomes: APPROVED, DENIED, REJECTED_BY_RULES (status), HUMAN_REVIEW (status). The response carries probability, a SHAP explanation list (feature, label, impact, direction), bias_report (decision CLEARED/other, bias_score, threshold, metrics, confidence_intervals, group_sizes), email (body split by `---` into decision letter + offers, attempts, sent, recipient) and marketing (eligible_products, product_count).
- The fairness audit is model-level, so it is the same for every applicant.

## Capabilities and Constraints

- Gender and marital status are collected for fairness monitoring only and are not model inputs. The UI must keep saying so.
- Loan amount is entered in thousands. Client-side checks: DTI ≤ 60%, income ≥ 500.
- Frontend-led product. Small, backward-compatible backend changes are allowed when a UI need requires them (e.g. storing SHAP factors and the rejection message with each application, returning `application_id` from `/predict`).
- Users can review their past applications (`GET /applications/{user_id}`); runs saved before the factors column existed have no stored SHAP factors.
- Public, unauthenticated surfaces: the landing page and `GET /model`. `/predict` and history require a Supabase session.
- Not for real lending decisions (educational project).

## Brand Commitments

Name: "LoanWise AI". No other visual commitments. The user rejected purple/violet-heavy palettes as looking like generic AI output and asked for a modern, sleek product feel (2026-11-21).

## Evidence on Hand

Real figures in README and `src/model_report.json` (614 applications, repeated stratified CV, 73 pytest tests). Do not invent customers, testimonials, rates or performance claims beyond these.

## Product Principles

1. Show the reasoning, not only the verdict.
2. Honesty over hype: label limits and synthetic data; never overstate the model.
3. A reviewer should understand the pipeline in a single run.
4. Fairness and guardrails are first-class results, not footnotes.
