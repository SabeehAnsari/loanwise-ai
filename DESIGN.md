---
name: LoanWise AI
description: Explained, audited loan decisions that float as frosted layers over a porcelain ground.
colors:
  ink: "#0E1116"
  ink-hover: "#262B33"
  ink-2: "#3B4350"
  muted: "#5B6472"
  faint: "#7A8391"
  ground: "#F3F5F8"
  ground-2: "#EBEEF3"
  white: "#FFFFFF"
  line: "rgba(14, 17, 22, 0.08)"
  line-2: "rgba(14, 17, 22, 0.14)"
  field-line: "rgba(14, 17, 22, 0.16)"
  hover: "rgba(14, 17, 22, 0.04)"
  glass: "rgba(255, 255, 255, 0.55)"
  glass-hi: "rgba(255, 255, 255, 0.68)"
  glass-edge: "rgba(255, 255, 255, 0.92)"
  pass: "#177A4C"
  pass-tint: "#E4F2EA"
  fail: "#C23B26"
  fail-tint: "#FBE9E5"
  warn: "#8F5600"
  warn-tint: "#FBF0DD"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(52px, 13cqi, 112px)"
    fontWeight: 650
    lineHeight: 0.9
    letterSpacing: "-0.055em"
    fontFeature: "'tnum' 1, 'ss01' 1"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(40px, 4.6vw, 64px)"
    fontWeight: 600
    lineHeight: 0.98
    letterSpacing: "-0.05em"
  section:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(32px, 3.6vw, 48px)"
    fontWeight: 600
    lineHeight: 1.04
    letterSpacing: "-0.045em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "30px"
    fontWeight: 600
    lineHeight: 1.15
    letterSpacing: "-0.03em"
  figure:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "clamp(28px, 5.4cqi, 44px)"
    fontWeight: 300
    lineHeight: 1
    letterSpacing: "-0.035em"
    fontFeature: "'tnum' 1"
  block-title:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1, 'ss01' 1"
  lede:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "18.5px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
rounded:
  sm: "8px"
  md: "10px"
  lg: "16px"
  xl: "22px"
  full: "99px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  2xl: "48px"
  3xl: "96px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.ink-hover}"
  button-primary-lg:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.white}"
    rounded: "12px"
    padding: "0 22px"
    height: "52px"
  button-glass:
    backgroundColor: "rgba(255, 255, 255, 0.7)"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  button-glass-hover:
    backgroundColor: "{colors.white}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "40px"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "42px"
  segment-selected:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "7px"
    padding: "7px 6px"
  chip:
    backgroundColor: "rgba(255, 255, 255, 0.7)"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  status-pass:
    backgroundColor: "{colors.pass-tint}"
    textColor: "{colors.pass}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  status-fail:
    backgroundColor: "{colors.fail-tint}"
    textColor: "{colors.fail}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  status-warn:
    backgroundColor: "{colors.warn-tint}"
    textColor: "{colors.warn}"
    rounded: "{rounded.full}"
    padding: "4px 10px"
  sheet:
    backgroundColor: "{colors.glass-hi}"
    rounded: "{rounded.xl}"
    padding: "4px 32px"
  sidebar:
    backgroundColor: "{colors.glass}"
    rounded: "{rounded.xl}"
    padding: "18px 14px 14px"
    width: "264px"
  nav-item-active:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "9px 10px"
  pipeline-stage-lit:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 10px"
---

# Design System: LoanWise AI

## Overview

**Creative North Star: "Glass & Light"**

A calm, light product where the decision pipeline and each decision float as frosted layers over a porcelain ground, and only the element that is working carries light. The ground is a cool near-white (`ground`) washed by soft white and blue-grey light fields painted on the page canvas, so every glass plane always has something to frost. On top of it sit at most three translucent planes per screen: a sidebar or floating nav, a form sheet, and one result sheet. Everything else is type, hairlines and white space laid directly on those planes or on the ground.

Type and actions are graphite. Colour is withheld for meaning: green, red and amber appear only where something passed, failed, needs a person, or pushed a score up or down. The result is an operating instrument rather than a fintech poster: dense enough to show rules, SHAP factors, a fairness audit and the decision letter in one sheet, quiet enough that the verdict word, set larger than anything else on the screen, is read first.

This world replaced the earlier violet "Statistical Release" world in full; nothing from the violet rail or Archivo type carries forward. It refuses the violet/navy AI-fintech look, the dark-neon AI look, and the white-card SaaS dashboard grid.

**Key Characteristics:**
- Porcelain ground with radial light fields on `html`; body stays transparent.
- Frosted white glass (55% and 68% white, 22px blur with 1.4 saturation, near-white hairline edge, inset top highlight, soft neutral shadow), on two or three planes only.
- Graphite ink for type, primary buttons, selected states and focus rings.
- Geist as the only family, tabular figures everywhere.
- Hairline-divided sections inside one sheet, never stacked cards.
- The verdict word lands from blur at display scale; one authored moment per run.

## Colors

A graphite-on-porcelain neutral system with three state colours and no brand accent.

### Primary
- **Graphite Ink** (ink): all headings and body-strong text, the primary button, the selected nav item's icon, the decision-cut marker, avatars, step numbers, text selection and every focus outline and ring. Graphite, not a hue, is the action colour.
- **Graphite Lift** (ink-hover): hover on the primary button only.

### Neutral
- **Porcelain Ground** (ground): the page base under the light fields; also the `theme-color`.
- **Porcelain Shade** (ground-2): the secondary ground tone.
- **Paper White** (white): the lit surfaces: text fields, the selected segment, the active nav item, the lit pipeline stage, the decision letter.
- **Slate Two** (ink-2): secondary text, ledes, form labels, letter body, unselected segment text.
- **Slate Muted** (muted): captions, metadata, table headers, field hints, affixes, nav icons at rest.
- **Slate Faint** (faint): stage numbers, skipped stages, the grey second clause of the landing headline, row chevrons.
- **Hairline** (line, 8% graphite): dividers between sections, table rows and list rows.
- **Hairline Strong** (line-2, 14% graphite): glass-button and chip borders, tracks of scales and ratios, the SHAP zero axis, section rules on the Model page ground.
- **Field Edge** (field-line, 16% graphite): text field and select borders at rest.
- **Hover Wash** (hover, 4% graphite): hover fill for quiet buttons, nav items and icon buttons; inline code background.
- **Frost** (glass) and **Bright Frost** (glass-hi): the two glass fills, for sidebar/nav/strips and for work sheets respectively. **Frost Edge** (glass-edge) is their 1px border.

### State
- **Pass Green** (pass) with **Pass Tint** (pass-tint): approved verdicts, passed rules, cleared audits, positive SHAP bars and values, success alerts.
- **Fail Red** (fail) with **Fail Tint** (fail-tint): denied verdicts, the rule that stopped an application, negative SHAP bars and values, the fairness limit line, field errors, an over-limit repayment ratio.
- **Warn Amber** (warn) with **Warn Tint** (warn-tint): human review and anything that hands the decision to a person.

### Named Rules
**The State-Only Rule.** Green, red and amber encode state and direction only (pass/fail/review, helps/hurts). They never decorate, never mark a primary action, and never tint a plane. Primary actions are graphite.

**The No-Accent Rule.** There is no brand hue. A new screen that needs emphasis gets it from scale, weight, white light or graphite, not from a new colour.

## Typography

**Display Font:** Geist (with ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif)
**Body Font:** Geist
**Label/Mono Font:** Geist; `ui-monospace` only for inline code.

**Character:** One neo-grotesque family carries the whole system through weight (300 to 650) and tracking, tightening hard as size grows. Body text runs with tabular figures and stylistic set 01 on, so every probability, gap and amount aligns in columns.

### Hierarchy
- **Display** (650, clamp(52px, 13cqi, 112px), 0.9, -0.055em): the verdict word only (Approved, Denied, Human review), coloured by state. Sized to its container, so it scales with the result sheet.
- **Headline** (600, clamp(40px, 4.6vw, 64px), 0.98, -0.05em): the landing hero headline; its second clause drops to Slate Faint.
- **Section** (600, clamp(32px, 3.6vw, 48px), 1.04, -0.045em): landing band headings; the closing band uses a smaller clamp(28px, 3.2vw, 42px).
- **Title** (600, 30px, 1.15, -0.03em): app page titles (New decision, History). Auth card titles use 28px.
- **Figure** (300, clamp(28px, 5.4cqi, 44px), 1, -0.035em): the probability beside the verdict. Light weight keeps the number subordinate to the word. Smaller figures (approval rates, hero facts) sit at 26px, 400 to 500.
- **Block title** (600, 15px, -0.01em): the heading of each hairline section inside a sheet (What moved this decision, Fairness audit, Decision letter). Form section titles use 14px.
- **Body** (400, 15px, 1.5): default text; tables and lists run at 14.5px. Measure caps at 64 to 72ch.
- **Lede** (400, 18.5px, 1.55): landing intro, max 48ch.
- **Label** (500, 12.5px to 13px): field labels, captions, metadata, table headers. Sentence case, no tracking, never uppercase.

### Named Rules
**The Verdict-First Rule.** The verdict word is the largest type on any screen where it appears. Nothing else in that viewport, not the page title or a figure, may match it.

**The One Family Rule.** Geist is the only family. Hierarchy comes from size, weight and negative tracking, not from a second face.

**The Tabular Rule.** Figures are always tabular (`font-variant-numeric: tabular-nums`) so numbers in tables, scales and the pipeline align.

## Layout

The app is a two-column grid: a 264px sticky glass sidebar inset 16px from the viewport edge, then a work area padded 28px 36px 64px. On New decision the work area splits into a form sheet (minmax(400px, 500px)) and a fluid result column with a 24px gap; Decision detail pairs the result sheet with a 300px Application sheet. History and Model use the full work width.

The landing page is a 1296px container with 24px gutters (16px on phones), a floating glass nav sticky 16px from the top, a two-column hero (0.92fr / 1.08fr, 56px gap), and bands spaced 96px apart (64px on phones). Evidence bands split 0.8fr / 1.2fr.

Spacing sits on an 8px grid with a 4px half-step: 8 between chips and controls, 16 between related groups, 24 between sheets and in sheet padding, 32 for large sheet padding, 48 to 96 between landing bands. Results stack as blocks with 26px vertical padding, each divided from the next by a hairline.

Breakpoints: below 1200px the workspace, detail and hero go single-column; below 1024px the sidebar becomes a sticky top bar (brand, icon-only nav, a horizontal stage strip showing short stage names, the lit stage keeping its value); below 760px the landing nav drops its links, form fields go single-column, figure grids go to two columns and sheet padding tightens to 18px.

### Named Rules
**The Three-Planes Rule.** At most three glass planes per screen: the sidebar (or landing nav), the form sheet, and one result sheet. A fourth surface means content belongs on an existing plane as a hairline section, or on the ground.

**The Sections-Not-Cards Rule.** Inside a sheet, content is split into sections by 1px hairlines, never into nested cards. The Model page lays its sections directly on the ground with stronger hairlines (line-2) and no sheet at all.

## Elevation & Depth

Depth comes from translucency and blur first, shadow second. Each glass plane frosts the light fields behind it, carries a 1px near-white edge and an inset 1px white highlight along its top, and casts a soft, wide, neutral shadow. Lit elements on a plane (active nav item, lit stage, selected segment, selected demo tab) are opaque white with a small lift shadow; that white is what "light" means in this system.

### Shadow Vocabulary
- **Plane low** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 1px 2px rgba(14,17,22,0.04), 0 8px 24px rgba(14,17,22,0.05)`): sidebar, landing nav, stage strip, closing band.
- **Plane high** (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.95), 0 2px 6px rgba(14,17,22,0.04), 0 24px 60px rgba(14,17,22,0.10)`): work sheets (form, result, panels, auth card).
- **Lit chip** (`box-shadow: inset 0 0 0 1px <state at 35%>, 0 4px 14px rgba(14,17,22,0.08)`): the lit pipeline stage and the selected landing demo tab; the inset ring takes the stage's state colour.
- **Selected control** (`box-shadow: 0 1px 2px rgba(14,17,22,0.08), 0 2px 8px rgba(14,17,22,0.06)`): the checked segment. The active nav item uses the same family (0.06 / 0.05).
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(14,17,22,0.14)`): focused fields; invalid fields switch to a red 16% ring. Everything else focuses with a 2px graphite outline offset 2px.

### Named Rules
**The Only-What-Works Rule.** Only the active or deciding pipeline stage carries light: a white raised chip with a state-coloured inset ring. Every other stage stays flat on the glass with a coloured value at most. While a run is in flight, the light walks the stages in order with a white sweep.

## Shapes

Soft, consistent corners scaled to the surface: 8px on small icon buttons and inline nav links, 10px on buttons, fields, segmented controls, nav items and stages, 12px on large buttons, 16px on the decision letter, the account card and the mobile top bar, 22px on every glass plane, 28px on the landing closing band. Chips, tags, status pills and the avatar are fully round. Borders are always 1px hairlines; tracks and bars are 4 to 6px tall with fully rounded ends.

## Components

### Buttons
Quiet and solid; graphite carries intent.
- **Shape:** gently rounded (10px), 40px tall, 16px side padding, 14px weight 550 label; large variant 52px tall, 12px radius, 16px label.
- **Primary:** graphite fill, white label; hover lifts to Graphite Lift; disabled turns Slate Muted with a progress cursor.
- **Glass:** 70% white with a Hairline Strong border; hover goes fully white with a darker border. Used for secondary actions (Read the model card, Try again, Copy text).
- **Quiet:** transparent, Slate Two label, Hover Wash on hover.
- **Press:** every button drops 1px on `:active`; a trailing arrow icon nudges 3px right on hover.

### Chips and Status
- **Sample chips:** fully round, 70% white, Hairline Strong border, 13px label with an optional muted hint line; hover goes white.
- **Status pills:** fully round, 13px weight 550, state colour on its tint (Passed, Cleared, Human review); neutral skip state uses Slate Muted on Hover Wash.
- **Tags:** fully round 75% white with a Hairline border; a struck-through muted variant marks excluded inputs.

### Cards / Containers (Sheets)
- **Corner Style:** 22px.
- **Background:** Bright Frost with 22px blur and 1.4 saturation.
- **Shadow Strategy:** Plane high (see Elevation).
- **Border:** 1px Frost Edge.
- **Internal Padding:** 24px for form and panel sheets; the result sheet pads 32px sideways and lets each hairline block carry 26px vertical padding.

### Inputs / Fields
- **Style:** white fill, 1px Field Edge border, 10px radius, 42px tall, 12px padding, 15px text; currency prefixes and unit suffixes sit inside the field in Slate Muted.
- **Focus:** border turns graphite with the 3px graphite focus ring.
- **Error:** red border and red ring; the message sits below in 12.5px red with an alert icon.
- **Segmented control:** 5% graphite trough, 3px inset, 10px radius; the checked option becomes a white chip with the selected-control shadow and weight 550. Used for every small enumerated choice instead of selects.

### Navigation
- **App sidebar:** glass plane with brand, three nav items (17px icon plus 14.5px label), the pipeline, then a disclaimer and the account card pinned to the bottom. Active item is a white raised chip in graphite at weight 550; hover is Hover Wash. Below 1024px it becomes a top bar with icon-only nav and a horizontal stage strip.
- **Landing nav:** a floating glass bar, 58px tall, 16px radius, sticky 16px from the top, with brand, anchor links, a quiet Sign in and a graphite Try the demo.

### Pipeline (signature)
Five numbered stages (Business rules, Model + SHAP, Fairness gate, Email guardrails, Products), each a three-column row of number, name and a state-coloured value. Only the deciding stage, or the running stage during a request, is lit (see The Only-What-Works Rule). The landing demo strip reuses the same light as a tablist: selecting a stage swaps the sheet below to that stage's evidence.

### Verdict and decision sheet (signature)
A masthead line (applicant in graphite, timestamp and model version in muted), then the verdict word at display scale in its state colour with the light-weight probability beside it, a 6px probability scale with a graphite 50% cut marker, and a one-paragraph reason. Below it, hairline sections: SHAP factors as diverging bars (green right, red left of a centre axis, values right-aligned in state colour), the fairness audit table with confidence-interval plots against a dashed red limit, the decision letter on a white 16px paper inset, and eligible products. When a run publishes, the sheet's sections land from blur in sequence (800ms, ease-out-expo, 14px rise, 10px blur, 60 to 90ms stagger). Reduced motion removes it.

## Do's and Don'ts

### Do:
- **Do** keep every screen to three glass planes at most: sidebar or nav, form sheet, one result sheet.
- **Do** split results into hairline-divided sections inside one sheet, and lay the Model page directly on the ground with Hairline Strong rules.
- **Do** light only the active or deciding pipeline stage: a white raised chip with an inset ring in its state colour.
- **Do** make the verdict word the largest type on any screen it appears on.
- **Do** use graphite (#0E1116) for primary actions, selected states and focus.
- **Do** reserve pass green #177A4C, fail red #C23B26 and warn amber #8F5600 for state and direction.
- **Do** set everything in Geist with tabular figures, and space on the 8px grid.
- **Do** use the shared 1.75-stroke SVG icon set for every directional or status glyph.

### Don't:
- **Don't** put eyebrows or kickers above headings; headings stand alone.
- **Don't** use the hero-metric template (one giant number with a small label as the page's centrepiece).
- **Don't** nest cards inside sheets or stack results as separate cards.
- **Don't** use Unicode arrows or symbols in place of icons.
- **Don't** introduce a brand hue; the violet rail of the replaced world is gone.
- **Don't** add a second type family or uppercase tracked labels.
- **Don't** tint glass planes with state colour; state lives in text, bars, rings and pills.
