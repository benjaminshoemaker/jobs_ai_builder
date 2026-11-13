# UI/UX implementation review

## Context

The current surface is a standalone HTML/CSS/JavaScript design prototype for a curated U.S. builder-role board. The repository's TypeScript CLI is a separate product surface. Open Studio with Apricot, compact previews, and the application CTA priority are established user decisions.

## High priority — addressed

- The native detail dialog lacked an accessible name. It now references its role title, and initial focus moves to that title so long content starts at the beginning. Opening another role resets the dialog scroll position. Native dialog behavior handles Escape, modal focus containment, and focus restoration.
- Primary and secondary card actions, feedback, filter checkbox labels, navigation links, and the dialog close button now have at least a 44px target where applicable.
- Long role titles and employer text now allow wrapping within their containers. The close button cannot shrink beside a long title. Background page scrolling is locked while a modal is open.

## Medium priority — addressed

- Replaced the feedback emoji with an inline SVG using the interface text color.
- Added short color transitions, disabled when reduced motion is requested.
- Consolidated the approved visual and information rules in `DESIGN_LANGUAGE.md` and linked them from `AGENTS.md`.

## Research and judgment

The [W3C modal example](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/dialog/) supports labeling a dialog with its title and focusing initial static content in long dialogs. [W3C's native dialog technique](https://www.w3.org/WAI/WCAG22/Techniques/html/H102) describes the native keyboard and focus behavior used here. [MDN](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog) documents `showModal()` and modal semantics.

Retain native selects rather than introducing custom dropdowns solely for appearance. The current filters are simple, and native controls provide useful keyboard behavior. Competitor information architecture was already researched in this exploration; this pass does not reopen the selected visual direction. The optional ui-ux-pro-max database was unavailable and was not needed for these fixes.

## Verification and limits

Calculated Apricot contrast ratios: body on panel 14.42:1; muted text on panel 7.19:1; accent text on accent-soft 6.44:1; white on primary action 7.97:1; heading on hero 8.63:1; muted text on page 6.51:1. These checked combinations exceed 4.5:1; this is not a complete accessibility certification.

Code-level checks cover captured descriptions, preview content boundaries, and dialog markup. Rendered responsive and keyboard checks remain outstanding: browser policy blocked access to the user's `file://` preview earlier in this session. No alternate browser route was used to bypass that restriction. Desktop/mobile appearance, focus restoration, and overflow need a permitted rendering check before calling the UI verified.

## Future-Proofing

Use `DESIGN_LANGUAGE.md` as the implementation contract. Extract the selected tokens and components during the working-board build rather than adding a framework to the prototype. Add interaction coverage when that runtime exists, especially filter persistence, empty results, shareable role details, modal focus, and feedback submission states. Keep live-board loading and failure states explicit; the current sample has no asynchronous publishing workflow.

## Detail-view follow-up

The user found the previous continuous text difficult to scan. Replaced six repetitive editorial sections with one short assessment and optional scope/qualification detail. Added a facts panel, sticky Apply/Close controls, and employer-heading disclosures with expand/collapse all. Employer wording and section order are preserved; role/qualification sections are initially expanded. The source text remains fully available. Rendered appearance and interaction still require verification in a permitted browser environment.

Future-proofing for the detail view: use this information order in the working application, keep the employer-text transformation separate from editorial copy, and test content preservation across employers with irregular heading markup.
