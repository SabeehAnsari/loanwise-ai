---
name: LoanWise AI
description: Explained, audited loan decisions, published like an official statistical release.
colors:
  ink: "#17151C"
  ink-2: "#3A3642"
  muted: "#5F5B68"
  ground: "#F4F4F2"
  paper: "#FBFBFA"
  white: "#FFFFFF"
  hair: "#DDDCD6"
  hair-2: "#E8E7E2"
  grid: "#EAE9E4"
  field: "#C9C7C0"
  rail: "#2A1F4D"
  rail-2: "#362A60"
  rail-line: "#4A3D78"
  rail-text: "#E9E4FA"
  rail-muted: "#A99BD8"
  violet: "#5B3FD0"
  violet-hover: "#4C33B8"
  violet-tint: "#ECE8FB"
  pass: "#1F7A4D"
  pass-tint: "#E3F1E9"
  pass-on-rail: "#7FD1A6"
  fail: "#C8321E"
  fail-tint: "#FBE7E3"
  fail-on-rail: "#F49A88"
  warn: "#9A5B00"
  warn-tint: "#FBF0DC"
  warn-on-rail: "#F2C46B"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(52px, 15cqi, 116px)"
    fontWeight: 800
    lineHeight: 0.86
    letterSpacing: "-0.035em"
    fontVariation: "'wdth' 78"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(30px, 3.2vw, 42px)"
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: "-0.025em"
    fontVariation: "'wdth' 88"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "30px"
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: "-0.02em"
  block-title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    letterSpacing: "-0.005em"
  figure:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: "-0.02em"
    fontFeature: "'tnum' 1"
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "'tnum' 1"
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 500
  caption:
    fontFamily: "Archivo, ui-sans-serif, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
rounded:
  base: "3px"
  pill: "99px"
spacing:
  xs: "6px"
  sm: "10px"
  md: "16px"
  lg: "28px"
  xl: "44px"
  gutter: "36px"
components:
  button-primary:
    backgroundColor: "{colors.violet}"
    textColor: "{colors.white}"
    rounded: "{rounded.base}"
    height: "50px"
    padding: "0 18px"
  button-primary-hover:
    backgroundColor: "{colors.violet-hover}"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    padding: "7px 12px"
  button-rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-text}"
    rounded: "{rounded.base}"
    padding: "7px 10px"
  button-rail-hover:
    backgroundColor: "{colors.rail-2}"
  chip-sample:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "5px 12px"
  chip-sample-hover:
    backgroundColor: "{colors.violet-tint}"
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.base}"
    height: "42px"
    padding: "0 12px"
  segmented-selected:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.white}"
    height: "42px"
  rail:
    backgroundColor: "{colors.rail}"
    textColor: "{colors.rail-text}"
    width: "264px"
---

# Design System: LoanWise AI

## Overview

**Creative North Star: "The Statistical Release"**

Every decision is published the way a central bank publishes an annual report: a numbered table of contents, ruled sections, captioned figures and tables, and numbers set in tabular figures so they can be audited down a column. The page is a document, not a dashboard. Structure comes from 2px ink rules and hairline rows on a cool off-white ground, never from boxed cards.

A violet-ink rail holds the brand and the five-stage pipeline index; its right-hand "page number" column fills with each stage's result after a run, and the stage that decided the outcome extends out of the rail onto the page ground. The working area splits into a paper-white form column and a result column that carries a faint eight-column grid. The verdict word is the one moment of display scale; everything around it is restrained, dense and captioned.

Density is reading density: 15px body, 12.5px captions, generous rule-to-rule spacing (44px between blocks) rather than generous padding inside boxes. Colour carries state only. The one authored motion is the release "publishing" block by block.

**Key Characteristics:**
- Violet-ink rail plus one violet action colour on a cool off-white ground.
- Single family (Archivo) using its width axis: condensed for display, normal for text.
- Tabular numerals everywhere.
- Sections headed by a 2px ink rule; rows divided by 1px hairlines.
- Figures and tables numbered inline in their titles ("Fig. 1", "Table 1", "Doc. 1") with a muted caption beneath.
- Flat: no cards, no badges, no elevation shadows.
- Green, vermilion and amber appear only as decision or rule state.

## Colors

A near-monochrome document palette: ink on cool paper, a deep violet shell, one saturated violet for action, and three state colours.

### Primary
- **Release Violet** (violet): the single action and identity accent. Primary button, focus outline, caret, text selection, links, figure numbers ("Fig. 1"), product list icons, the focused stage number. Hover deepens to **Pressed Violet** (violet-hover); **Violet Wash** (violet-tint) is the hover fill for chips and segmented options.

### Secondary
- **Violet Ink** (rail): the shell. Pipeline rail, sign-in statement panel, the browser theme colour, and the selected state of segmented controls, which ties form choices back to the pipeline. **Rail Raised** (rail-2) is the rail button hover; **Rail Rule** (rail-line) divides rail rows; **Rail Text** (rail-text) and **Rail Muted** (rail-muted) are the two text levels on the rail.

### Tertiary (state only)
- **Pass Green** (pass), **Vermilion** (fail), **Ledger Amber** (warn): verdict word, probability fill, SHAP bars and values, rule results, status lines, alert rules, the ratio-over-limit warning and CI limit markers. Each has an on-rail variant (pass-on-rail, fail-on-rail, warn-on-rail) for stage values on the violet rail, and a tint defined for future fills.

### Neutral
- **Release Ink** (ink): body text, 2px section rules, chart axes and CI points.
- **Ink Two** (ink-2): secondary text, field labels, ratio fill, CI whiskers.
- **Muted Slate** (muted): captions, hints, metadata, table headers.
- **Cool Ground** (ground): page background; also the fill of the focused stage that extends out of the rail.
- **Paper** (paper): form column and sign-in form side.
- **White** (white): field, chip and letter interiors.
- **Hairline** (hair) and **Hairline Light** (hair-2): row dividers, tracks, skeleton shimmer.
- **Column Grid** (grid): the faint vertical grid lines behind the result column.
- **Field Stroke** (field): input, select, chip and segmented-control borders.

### Named Rules
**The State-Only Colour Rule.** Green, vermilion and amber mean pass, fail and review. They never decorate, and nothing else is coloured those hues.

**The One Violet Rule.** Release Violet marks what you can act on or follow (button, focus, link, figure number). Violet Ink is the shell. No third accent.

## Typography

**Display Font:** Archivo (variable, wdth 62–125, wght 300–800), with ui-sans-serif, system-ui fallback
**Body Font:** Archivo
**Label/Mono Font:** Archivo; no mono. Numbers use tabular figures set on `body`.

**Character:** One grotesque doing every job, with the width axis as the hierarchy device: condensed and heavy for the verdict and statements, normal width for reading. Swiss-report plain, never decorative.

### Hierarchy
- **Display** (800, clamp(52px, 15cqi, 116px), 0.86, condensed to 78% width): the verdict word only ("Approved", "Declined", "Review").
- **Headline** (700, clamp(30px, 3.2vw, 42px), 1.05, 88% width): empty-state intro title; the sign-in statement uses the same voice at clamp(34px, 3.6vw, 54px), 84% width.
- **Title** (700, 30px, 1.15): page title in the form column.
- **Block title** (700, 16px): result block headings, preceded by the violet figure number. Form section titles use 14px/700.
- **Figure** (400, 26–34px, light tracking): headline metrics, approval-rate figures, sign-in figures; the verdict probability goes lighter still (300, up to 54px).
- **Body** (400, 15px, 1.5): text and table cells (14.5px in tables and SHAP rows); lede and verdict message at 15.5px, max 60–62ch.
- **Label** (500, 13px): field labels, chip and secondary button text.
- **Caption** (400, 12.5px, Muted Slate): captions (max 70ch), hints, metadata, notes.

### Named Rules
**The Tabular Rule.** Every number is set in tabular figures so columns align and can be audited.

**The Width-Axis Rule.** Hierarchy at the top end comes from condensing Archivo, not from adding a second family. Sentence case throughout; no uppercase tracking.

## Layout

Desktop (1280px and up): a three-zone grid. Sticky 264px violet rail, then a workspace split into a form column (minmax(400px, 500px), paper, 36px gutters, hairline right border) and a result column (36px / 48px padding, content capped at 820px, an inline-size container so the verdict scales with the column). The result column carries a faint eight-column grid (1px Column Grid lines every 12.5%) clipped to its content box.

Vertical rhythm: 28px between form sections, 44px between result blocks, 10px from a rule to its heading, 14px from heading to content, 16px × 18px field grid gaps in a two-column field grid.

Below 1280px the rail becomes a top band: brand and account in one row, the five stages as a five-column strip divided by vertical rail rules, stage descriptions hidden. The workspace narrows to minmax(360px, 440px) for the form. Below 900px the form and result stack; the sign-in panel stacks over the form. Below 640px gutters drop to 16px, fields go single-column, metric grids go to two columns, the result grid background and CI plot column are removed.

## Elevation & Depth

Flat. There are no elevation shadows anywhere. Depth is expressed by tone (violet rail against cool ground against paper columns against white fields) and by rule weight (2px ink rule over 1px hairline). The only box-shadow in the system is the 3px focus halo on inputs, a state signal rather than elevation.

### Shadow Vocabulary
- **Focus halo** (`box-shadow: 0 0 0 3px rgba(91, 63, 208, 0.18)`): focused input or select. Error variant `0 0 0 3px rgba(200, 50, 30, 0.16)`.

### Named Rules
**The Ruled-Not-Boxed Rule.** A section is a 2px ink rule followed by a heading, not a card. Containers do not get backgrounds, borders on all sides, or shadows. The decision letter is the single bordered surface, because it represents a separate document.

## Shapes

Square-shouldered. One small radius (3px) on buttons, inputs, selects and segmented controls; the brand mark uses 4px. Sample chips are the only pill (99px). Chart marks are hard rectangles (SHAP bars, probability fill, ratio track); CI points are the only circles. Lines carry the form: 2px rules, 1px hairlines, 1px axes, a dashed vermilion limit line.

## Components

### Buttons
Plain and confident; one filled button per surface.
- **Shape:** gently squared (3px).
- **Primary:** full-width Release Violet bar, 50px tall, white 15.5px/600 label left-aligned with an arrow icon right-aligned (space-between), 0 18px padding.
- **Hover / Focus:** background to Pressed Violet; arrow nudges 3px right (200ms ease-out). Disabled while running uses a lightened violet and progress cursor. Focus is the global 2px violet outline at 2px offset.
- **Secondary:** white with Field Stroke border, 13.5px/500, 7px 12px; hover darkens border to Ink Two (e.g. "Copy text").
- **Rail:** transparent on the rail with Rail Rule border, Rail Text label; hover fills Rail Raised. Focus outline switches to Rail Text.
- **Link button:** violet 600 text, 1px underline at 3px offset.

### Chips
- **Style:** sample-application shortcuts only. White pill, Field Stroke border, 13px/500 ink text, 5px 12px.
- **State:** hover turns border violet and fill Violet Wash.

### Cards / Containers
There are no cards. Blocks are introduced by a block head: 2px ink top rule, 10px padding, title left (violet figure number + 16px/700 title) and muted meta right, followed by content and a 12.5px muted caption. Form groups use the same 2px rule on a fieldset with a 14px title and optional right-aligned note.

### Inputs / Fields
- **Style:** 42px, white, 1px Field Stroke, 3px radius, 15px ink text; italic placeholder; muted "$" prefix and unit suffix sit inside the field.
- **Focus:** border to Release Violet plus the focus halo.
- **Error:** vermilion border and halo; error text 12.5px vermilion with an alert icon. Hint text 12.5px muted below.
- **Select:** same box with an inline chevron.
- **Segmented control:** a single bordered strip of equal options split by 1px Field Stroke; hover fills Violet Wash; selected fills Violet Ink with white 500 text.

### Navigation
The pipeline rail is the navigation and the table of contents. "Pipeline" heading over a 2px Rail Text rule, then numbered rows (01–05, Rail Muted number, stage name, 12px description, right-aligned value) divided by Rail Rule hairlines. Values colour by state with the on-rail variants. While running, a 1px scan line sweeps under the current row. Account and sign-out sit at the rail foot with the educational disclaimer.

### Pipeline Index (signature)
After a run, the stage that decided the outcome extends out of the rail onto the page: its row fills Cool Ground, bleeds 24px into the workspace edge, its number turns violet and its value takes the full-strength state colour. This is the hinge between the rail and the release.

### Verdict and Figures (signature)
- **Masthead:** applicant name left, run id, timestamp and model version right, between a 2px ink rule and a hairline.
- **Verdict:** the condensed display word in its state colour beside a light-weight probability figure; beneath, a 6px probability track with a state-coloured fill and a 1px ink cut-off tick labelled "50% cut-off".
- **Fig. 1 diverging bars:** centred 1px ink axis, green bars right, vermilion bars left, signed values right-aligned in tabular figures, hairline rows, a "← hurts / helps →" legend and a caption.
- **Tables:** muted 12.5px headers over a 1px ink rule, hairline rows, right-aligned numeric columns; CI plots as whisker-and-point with a dashed vermilion limit.
- **Figure strips:** four-up metric figures over a hairline, each with a muted label and n.

### Notice and Alert
Inline, ruled not boxed: a 2px top rule in the state colour, icon and text, no fill.

### Motion
One authored moment: a decision publishes block by block (700ms ease-out cubic-bezier(0.16, 1, 0.3, 1), staggered 120–420ms, rising 10px and unclipping). Bars and fills grow on the same ease (800–900ms). Hover transitions 150ms. Everything collapses under reduced motion.

## Do's and Don'ts

### Do:
- **Do** head every section or block with a 2px ink rule (Release Ink) and divide rows with 1px Hairline.
- **Do** number result figures and tables inline in the title ("Fig. 1", "Table 1", "Doc. 1") in Release Violet, and caption them in 12.5px Muted Slate.
- **Do** set all numbers in tabular figures and right-align numeric columns.
- **Do** reserve Pass Green, Vermilion and Ledger Amber for decision and rule state, using the on-rail variants on Violet Ink.
- **Do** use the Archivo width axis for display hierarchy (verdict 78%, statements 84–88%).
- **Do** keep the 3px radius on interactive controls and the single violet filled button per surface.

### Don't:
- **Don't** use cards, badges, or soft drop shadows; this world refuses the white-card fintech dashboard.
- **Don't** introduce a second typeface or uppercase tracked labels.
- **Don't** colour anything green, red or amber unless it reports a state.
- **Don't** add a second accent hue beside Release Violet and Violet Ink.
- **Don't** box a block with a full border or background; the decision letter is the only bordered surface.
