# Builder board design language

## Established direction

Open Studio with Apricot: warm, approachable, and clear enough to scan repeatedly. Use one sans-serif family, restrained type roles, warm cream surfaces, and brown actions. The working token source is `apps/board/public/tokens.css`; component styles live in `apps/board/public/styles.css`. `design/board-concepts.html` preserves the approved exploration. `design/BOARD_DESIGN_BRIEF.md` records the product decisions and references.

## Information and actions

- Cards show employer name and logo, role title, workplace, published pay, work focus, and prior-SWE gate.
- Apply on company site is the filled primary action. View Role Details is an outlined secondary button below it, including on mobile.
- Keep builder rationale, experience details, full employer text, and the verification footnote in role details.
- Keep the labeled feedback action quiet and reversible. The prototype records flags only in its current page session.
- Never infer missing pay or qualifications. Preserve distinctions between base salary, bonus, equity, and unspecified compensation.

## Craft and accessibility

Use layout, spacing, and a small number of text sizes for hierarchy. Avoid additional font families, uppercase card headings, decorative corner arrows, and qualifications paragraphs on cards. Use warm cream cards with a restrained single shadow; avoid thick offset ledges. Use a dedicated control-border token for accessible input and secondary-button boundaries.

Use consistent inline SVG icons with visible labels where helpful. Controls should offer at least a 44px target, visible keyboard focus, and hover feedback without movement. Respect reduced-motion preferences. Native select controls are appropriate for these simple filters.

Use the native modal dialog with an accessible title, initial focus at the start of long content, a visible close button, Escape support, and native focus restoration. Protect long titles and employer text from horizontal overflow. Keep the company logo decorative while its name is visible.

## Implementation handoff

The working board in `apps/board` extracts the selected tokens and browsing behavior from the prototype. Keep catalog data separate from presentation and retain the shared role-card, action, filter, and detail styles as the application evolves. Avoid transferring unused visual explorations into the application. Verify widths of 375, 768, 1024, and 1440px, keyboard use, long titles and descriptions, empty results, and changed or unavailable postings. The current prototype is a dated sample, not a live source of job availability.

## Audit refinement

Avoid repeated uppercase eyebrow labels. Convey U.S. scope in the result count and use sentence-case filter headings. The mockup and app share the refined token values and component declarations, guarded by the board parity tests. See `design/audit/UI_FIDELITY_AND_X_RESEARCH.md` for the X/Grok research, source verification and applicability decisions.

Salary and city/state filters are an intentional extension of the original mockup. Label salary-range semantics and unknown pay plainly, keep compensation components separate, and make inclusion of nationwide remote work explicit. Do not infer remote eligibility from headquarters or from an ambiguous Remote label.

Location filtering uses a multi-select of available city/arrangement combinations (Hybrid or Onsite), plus one independent Remote checkbox. Populate the choices from results under the other filters, retain selections when faceting, and keep an explicit empty selection distinct from the default all-city selection. There is no separate work-arrangement filter or location text input.

## Private candidate review

Preserve the Apricot foundation and use the shared admin stylesheet for the selected-job workspace. One full employer posting is selected at a time, with a short employer-diverse queue and persistent Yes / No / Maybe controls. On narrow screens collapse the queue and stack controls without horizontal overflow. Highlights and jump links identify reading cues rather than asserting fit; preserve negations and never turn a requirement cue into an inferred SWE gate. Evaluation examples must not expose model predictions through labels, sampling lanes or highlights. Keep source versions, human judgments and model assessments distinct as this UI evolves.
