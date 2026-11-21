---
version: 1
slug: "frontend-src-app-jsx"
primary_target: "frontend/src/App.jsx"
related_targets: ["frontend/src/components/Login.jsx"]
---

# LoanWise AI app shell (sign-in + application workspace)

Mode: operate. Audience: portfolio reviewers (admissions, recruiters, engineers) running one or two sample applications on a laptop. Job: submit an application and understand the explained, audited, constrained decision. Constraints: frontend only, same /predict API; gender and marital status stay labelled audit-only; educational disclaimer stays.

## Direction contract

THESIS: Every decision is published like an official statistical release: numbered pipeline stages, a captioned figure, and audit-able numbers. Refuses the white-card fintech dashboard with stacked soft-shadow cards.
OWN-WORLD: Violet-ink rail (#2A1F4D) and violet action (#5B3FD0) on a cool off-white ground (#F4F4F2), ink #17151C. Archivo (wdth axis) with tabular numerals; 2px ink rules head each section, hairline rows, faint visible column grid in the result area. No cards, no badges, no shadows; states only in green #1F7A4D, vermilion #C8321E, amber.
STORY: A reviewer sees the five-stage pipeline before anything else, fills a short grouped form, and watches the verdict publish at display scale with Fig. 1 (SHAP), then fairness, email and products as the release's following tables. They leave believing every number is real and explained.
FIRST VIEWPORT: 248px violet rail with brand, the 01–05 pipeline index (stage results fill in after a run; failed/current stage extends) and the disclaimer. A 520px form column with three ruled groups (Applicant, Finances, Loan) and segmented controls. The result column opens on the verdict word at ~112px condensed beside the probability, then Fig. 1. The primary action is a full-width violet "Run decision pipeline" at the foot of the form.
FORM: Statistical Release (central-bank annual report / Swiss style), position 3 on the ordered list; seed:4d0468c1f24e000c. Signature move: the pipeline index as a table of contents whose page-number column becomes each stage's result; the SHAP figure as a centred diverging bar chart captioned "Fig. 1".
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
