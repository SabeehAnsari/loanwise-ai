---
version: 1
slug: "frontend-src-pages-landing-jsx"
primary_target: "frontend/src/pages/Landing.jsx"
related_targets: []
---

# LoanWise AI landing page (public, signed out)

Mode: persuade. Audience: portfolio reviewers (admissions, recruiters, engineers) arriving from a CV or GitHub link on a laptop. Action: Try the demo (create a demo account / open the app). Proof: real model figures from GET /model and the README (0.768 ROC-AUC vs 0.705 credit-history rule, 614 rows, bias 0.032 vs 0.20 limit). Constraints: no invented customers or claims; educational disclaimer visible; sample decision labelled synthetic.

## Direction contract

THESIS: A calm, light product where the pipeline and each decision float as frosted layers over a porcelain ground, and only the stage that is working carries light. Refuses the violet/navy AI-fintech look and the dark-neon AI look.
OWN-WORLD: Porcelain ground #F3F5F8 with soft white and cool blue-grey light fields; graphite ink #0E1116 for type and primary buttons; frosted white glass (backdrop blur, white hairline edge, soft neutral shadow) on two or three layers only; Geist with tabular figures; 8px grid, 12–22px radii; green #177A4C / red #C23B26 only for helps/hurts and pass/fail.
STORY: A reviewer reads one line, sees a real-looking decision sheet with its reasons, clicks through the five stages to see each one's evidence, checks the model card against a one-line rule, and presses Try the demo believing every number is real.
FIRST VIEWPORT: Floating glass nav (brand, How it works, Model, Fairness, GitHub, Sign in, graphite Try the demo). Left: fact pill, 72px Geist headline with a grey second clause, lede, graphite Try the demo + glass Read the model card, three real figures. Right: a glass five-stage strip with stage 02 lit, over a frosted decision sheet (synthetic sample, Approved 84.2% at verdict scale, SHAP bars).
FORM: Glass & Light (modern OS material), assigned position 7 on the ordered list; seed:d57e33caf8000228. Signature interaction: clicking or arrowing through the stage strip swaps the sheet to that stage's evidence (rules, SHAP, fairness, letter, products); the selected stage alone carries light. Raises: only the active element carries light; depth from 2–3 translucent planes; the verdict is the largest thing on screen; 8px grid; colour encodes direction only.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
