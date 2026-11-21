---
version: 1
slug: "frontend-src-app-jsx"
primary_target: "frontend/src/App.jsx"
related_targets: ["frontend/src/pages/AuthPage.jsx","frontend/src/pages/NewDecision.jsx","frontend/src/pages/History.jsx","frontend/src/pages/DecisionDetail.jsx","frontend/src/pages/ModelPage.jsx"]
---

# LoanWise AI app (sign-in, shell, new decision, history, decision detail, model)

Mode: operate. Audience: portfolio reviewers running one or two sample applications, then browsing history and the model card. Jobs: run a decision and understand it; revisit a past decision; check the model and fairness evidence. States: empty/first-run, running, approved, denied, rules-rejected, human review, API down, history empty/loading/error, factors not stored. Constraints: gender/marital labelled audit-only; numbers real; disclaimer present.

## Direction contract

THESIS: The same Glass & Light world as the landing page, held to operate restraint: a frosted sidebar and frosted work sheets over porcelain, with light reserved for the stage that decided the outcome. Refuses the white-card SaaS dashboard grid and the old violet rail.
OWN-WORLD: Porcelain ground with soft light fields; frosted glass sidebar and sheets (white 62–80%, blur, white hairline edge, neutral soft shadow); graphite primary buttons and selected segments; Geist with tabular figures; neutral greys for structure; green/red/amber for state only; 8px grid, 12/16px radii on sheets, 10px on controls.
STORY: After sign-in the reviewer lands on New decision with a first-run guide, picks a sample, runs it and watches the sidebar pipeline light stage by stage; the verdict lands at full scale with its reasons, audit and letter; it appears in History, opens as its own page, and the Model page backs every claim.
FIRST VIEWPORT: Glass sidebar (brand; New decision, History, Model & fairness; the five-stage pipeline with the deciding stage lit; account and sign out). Work area: a glass form sheet (grouped sections, segmented controls, sample chips, graphite Run decision) beside the result sheet (verdict word at display size with probability, then SHAP bars). Below 1024px the sidebar becomes a top bar with tabs and a stage strip.
FORM: Glass & Light (seed:d57e33caf8000228), applied to an operate surface; extends the landing page's world. Signature: the sidebar pipeline where only the deciding (or running) stage carries light, and the decision sheet that lands from blur when a run publishes.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
