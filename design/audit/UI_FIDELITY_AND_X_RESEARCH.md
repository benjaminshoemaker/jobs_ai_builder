# Mockup fidelity and X/Grok design audit

Reviewed October 28, 2026 (Pacific). Scope: approved Open Studio / Apricot mockup and the working local board. This is a broad practical inventory of design critiques, not a claim that a visual pattern can prove AI authorship or that every possible indicator has been enumerated.

## A. Fidelity to the approved mockup

Compared the selected mockup's CSS variables, component declarations, page structure, card markup and detail formatting against the working app, then inspected the rendered app. The core typography, palette, layout, cards, button order and detail structure were already carried over. Removed avoidable implementation drift:

- Empty feedback status no longer contributes layout space.
- Reset filters appears only when filters/search are active.
- Work-focus choices preserve editorial order instead of an unrelated alphabetical reorder.
- Added `apps/board/src/design-parity.test.ts` to compare effective Apricot tokens and shared card/control/detail declarations with the approved mockup.

Intentional application differences remain: the sample-availability notice, actual loading/failure states, persistent feedback, URL-based filters and role links. Prototype theme/palette switches and its session-only feedback explanation do not belong in the app. Source comparison excludes these study controls.

The earlier browser policy restriction on the `file://` mockup was respected. This audit uses the mockup's source as the baseline and rendered checks of the new HTTP application, not a fabricated before/after pixel-difference score.

## B. Research method and sources

Used the user's logged-in X session to ask Grok to search X, categorize recurring critiques, distinguish usability problems from taste, and preserve this board's established choices. [Grok conversation](https://x.com/i/grok?conversation=2843ddac-3ee4-4643-b161-a0c9b4c6af5d) returned twelve named post links and a broader source collection. Independently opened and read these five posts:

| Source | What it supports | Treatment here |
| --- | --- | --- |
| [Tommy Geoco, Oct 28](https://x.com/designertom/status/2115489045052612891) | Repeated small labels over headings have become a recognizable default. | Removed the redundant hero and results kickers. |
| [Code With Joe, Oct 26](https://x.com/usb_type_d/status/2114849969127805372) | Unnecessary text, icons and decoration produce visual clutter. | Kept the compact cards; avoided adding ornamental components. |
| [Pavel Rabtsevich, Oct 22](https://x.com/p_rabtsevich/status/2113291942628880395) | Secondary text readability matters more than soft-looking screenshots. | Rechecked text contrast and strengthened actual control boundaries. |
| [Paul Bakaus, May 2 as displayed in the logged-in browser](https://x.com/pbakaus/status/2050766371081081133) | Design skills can replace one set of fashionable defaults with another. | Retained the intentionally chosen palette and font instead of changing them simply because they appear on a list. Grok's approximate date differed by one day. |
| [Földes Dániel, Oct 28](https://x.com/officialfoldes/status/2115407663718629383) | Decoration can compete with hierarchy; credible material and clear communication matter. | Reduced redundant labels and exaggerated card elevation; retained real employers and dated source text. |

The conversation under Geoco's post also included a counterpoint from Sean Smith: useful clarity conventions can be unfairly discarded when associated with AI. Geoco replied that this association may be temporary. These are designer opinions and observations, not controlled evidence about usability or authorship.

Additional leads returned by Grok, not independently opened in this pass: [vikktorrrre](https://x.com/vikktorrrre/status/2092618580902728176), [AshikArtistry](https://x.com/AshikArtistry/status/2113602084389913056), [VibeRush_Kenji](https://x.com/VibeRush_Kenji/status/2115602486052671876), [tkkong](https://x.com/tkkong/status/2115634007744336192), [SchweigerOM](https://x.com/SchweigerOM/status/2115433454305431672), [tsvillain](https://x.com/tsvillain/status/2115381075749097490), [JonathanSchndr](https://x.com/JonathanSchndr/status/2115417323813400611). Claims attributed to these remain Grok-derived leads.

## Indicators assessed against this board

| Category | Indicators checked | Finding/action |
| --- | --- | --- |
| Layout | Repeated hero/feature/bento templates, unnecessary nested containers, numbered sections | No feature-grid or decorative dashboard added. Role cards serve actual records; keep them. |
| Typography | Repeated uppercase kickers, decorative monospace/italics, excessive weights, tight tracking | Removed both kickers and uppercase filter header. Preserve the chosen single sans family and existing role-title hierarchy. |
| Color | Default purple gradients, neon, arbitrary palette swaps, low contrast | No gradients/neon. Apricot is an explicit user choice, so retain it. |
| Elevation | Thick repeating shadows, floating everything, glass/blur effects | Replaced the 7px offset card ledge with one restrained 1px/2px shadow. Modal elevation remains functional. |
| Components | Excessive chips/icons/stripes, emoji, inconsistent controls | Retain only the two meaningful focus/SWE chips, real company logos, and labeled SVG feedback. No emoji or decorative corner arrow remains. |
| Copy | Generic marketing boilerplate, repeated labels, inflated language | Removed “Curated opportunities” and the redundant scope kicker. U.S. scope moves to the real result count. Preserve the user-defined think/build/ship proposition. Employer prose is not rewritten for aesthetic reasons. |
| Hierarchy | Equal visual weights, competing CTAs, text walls | Keep primary Apply and secondary Details. Preserve the approved facts panel and employer-section disclosures. Fixed the cramped mobile posting heading/expand control. |
| Accessibility | Weak secondary text, faint control boundaries, missing focus/labels, small targets | Checked text combinations remain above 4.5:1. Control borders improved from 1.71:1 to 3.49:1 against panels. Keep visible focus, native controls, reduced motion and 44px actions. |
| Responsive behavior | Desktop-only layout, wrapping CTAs, horizontal overflow, fixed elements colliding | Actual browser checks at 375, 768, 1024 and 1440px: six cards, no horizontal overflow, action heights 44px. Mobile posting heading and expand button now stack. |
| Credibility | Fake testimonials, metrics, avatars/logos, false live status, incomplete source text | No fabricated social proof. Keep sample notice. Browser content-preservation check found and fixed a dropped Babylist parent heading. All six full employer texts now match their source text after excluding the generated Overview interface label. |

All shared visual refinements were applied to the mockup and app together, keeping the approved reference useful. The result is a refinement of the selected direction, not a new theme based on Grok's taste.

## Verification

Rendered desktop, mobile board, and mobile detail captures are stored in this directory. Measured widths were 375, 768, 1024 and 1440px in the dedicated browser; Chrome's viewport override did not actually change its viewport, so those ineffective attempts are not counted as responsive verification. No horizontal page overflow was observed at the four real widths. Mobile dialog width was 351px in a 375px viewport, with its content contained.

`verify-employer-text.js` is a repeatable browser QA check against `/api/jobs`; it confirmed source-text preservation for Overjoy, Figma, Rillet, TRM Labs, Babylist and Faros. The generated Overview label is explicitly excluded. Consecutive employer headings are retained instead of replacing an empty parent section.

## Future-Proofing

Run the token/component parity tests when changing the shared visual language, and update the approved reference and implementation together for intentional changes. Evaluate supposed AI tells against purpose and usability before removing them. Preserve primary/secondary CTA order, truthful inventory status, real source material and accessible native controls. Keep the browser source-text check available for new employer formats; do not rely on screenshots alone to establish content fidelity.
