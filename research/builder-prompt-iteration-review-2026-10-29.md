# Prompt iteration: selected candidate builder-fit-v10

October 29, 2026. This is a policy-development review in the existing conversation, with known labels. No paid API calls, independent model runs, deployment, publication, or database writes were made.

Subsequent correction: after the fresh-batch review, the user reaffirmed Apollo's Yes and highlighted its explicit hybrid-builder mandate. The earlier conclusion below that accepting it necessarily weakens the boundary was too categorical. Treat that as an evidence-weighting error to correct, not an irreducible ambiguity or a change to the user's label. Original predictions and development scores remain preserved. [User-reviewed fresh-batch outcome](v10-fresh-review-2026-10-29.md#user-reviewed-outcome).

## Result

Two policy revisions improved agreement in the in-thread review of the same 33 frozen cases. The selected candidate is [builder-fit-v10](builder-classification-prompt-v10-2026-10-29.md), with a separately readable [policy](builder-classification-policy-v10-2026-10-29.txt).

| Policy | Historical label matches | Positives accepted | Negatives rejected | Positive abstentions | Positive recall in this review |
| --- | --- | --- | --- | --- | --- |
| v8 | 30/33 | 26/29 | 4/4 | 2 | 89.7% |
| v9 | 31/33 | 27/29 | 4/4 | 1 | 93.1% |
| v10 | 32/33 | 28/29 | 4/4 | 0 | 96.6% |

Each version still rejects Apollo against its historical Yes. There are no false positives in these four negatives. The corrected Figma Sales Operations Manager was additionally checked against its full archived text and remains No; it is outside the fixed 33-case comparison and is not silently added to improve its score.

These numbers describe the assistant's authored interpretations in this conversation. They are not independent executions or a measured improvement in a deployed model. The recording script scores the judgments; it does not generate them. Unchanged judgments and explanations were retained after reviewing the effect of each policy change. The changed roles and Figma guard were reread in full during this turn. This thread already contains the labels, calibration examples and earlier results. The CLI restriction on the requested exact model remains unresolved; no substitute model was used.

## Revision 1: interpret implementation evidence across sections

v9 clarifies that relevant personal-building requirements can explain how the role's responsibilities are performed, even when that language sits under qualifications. It also distinguishes engineering ownership of production architecture from ownership of all implementation. The complete role must connect those qualifications to hands-on building; a past project or generic technical fluency is insufficient by itself.

This resolves Amperity in the review. Its requirement for personally building agentic systems, direct AI/low-code prototyping and codebase testing is read together with shaping solutions and owning customer outcomes. The statement that engineering owns production architecture does not negate that mandate. This is an interpretation of the combined responsibilities, not an invented requirement to ship production code alone.

This rule preserves the conventional-PM boundary: experience once building something does not establish that the new job centrally involves personal building. It also preserves engineering collaboration for Axiad, TRM, Babylist, AwardSpring and other approved cases.

## Revision 2: distinguish functional building from artifact maturity

v10 clarifies how personal feature prototyping, implementation skills, user testing and participation in shipping can jointly establish the mandate. A named coding assistant or solo ownership of final production code is not mandatory. AI creative tools, model APIs and executable workflows may be building tools. Content production, benchmarking other products, or suggesting features alone remains insufficient, as does merely working on an AI product.

This resolves OpenArt in the review: the primary work joins technical feature prototyping, shipping with designers and engineers, daily user contact and practical AI-tool use. The judgment relies on that combination, not an explicit claim in the source that the intern writes AI-generated production code. The uncertainty has not been erased from the source itself; the prompt makes the intended whole-mandate interpretation clearer.

The role-specific qualifications and company context do not become employer-wide rules. No Amperity, OpenArt or Apollo example or name-based exception was added to the prompt. The same seven calibration vignettes are retained, with target-employer exclusion supported by the request constructors.

## Negative checks and full historical coverage

- Lab37: still No. Roadmap, requirements and coordination dominate; the explicit personal AI work is concept/MVP prototyping. The revisions do not make that alone sufficient.
- SQUIRE: still No. A conventional engineering director's hands-on pipeline work and AI enablement do not establish the combined AI-assisted builder mandate.
- Azul: still No. The posting establishes assistance with agents, skills and connectors plus IT/security support, without clear responsibility for a scoped useful solution and its outcomes. This is our interpretation; the user supplied no rejection rationale. No rule against interns or IT was introduced.
- OpenSesame Systems Administrator: still No. Administration, tickets, security and incremental automation remain the main mandate. This does not exclude the separately approved OpenSesame Product Builder Intern.
- Figma Sales Operations Manager: still No. The job primarily owns sales advice, forecasts, operating cadence and insights. Dashboards and AI-assisted analysis support that work; they do not establish the same personal software-product building mandate. The earlier Yes remains superseded by the user's correction.

All 54 historical reference judgments were inspected for boundary conflicts, including the 19 negatives and the two uncertain references. Only 29 historical approved roles are in the frozen full-text set, alongside the four newer exact-source negatives. Figma adds one full-text negative guard. The other 24 historical references—four positives, eighteen negatives and two uncertain cases—have metadata/label coverage here, not newly scored full-posting classifications. The JSON inventory makes those omissions explicit. Do not claim that all historical jobs were rerun or that their labels constitute independent validation.

Most historical positive original-text/label pairs are unverified. Some captured descriptions have changed. Four historical positives still lack full saved descriptions: Medecision, Rivian, Vailent/Vinmar and Vanta. These limitations are separate from prompt quality.

## Why iteration stopped here

Apollo's saved description clearly supports product strategy, user discovery, delivery coordination and personal AI prototyping. It does not clearly establish that personally implementing and shipping useful software is central to the new role. The historical Yes remains authoritative as a recorded judgment; this review does not relabel it.

I considered and rejected further directions:

1. Accept roadmap ownership plus past shipping experience plus AI prototyping. That can recover Apollo, but also admits the rejected Lab37 pattern; it sacrifices the central boundary.
2. Treat technical knowledge and working on an AI product as proof of AI-assisted building. That invents a missing connection between AI use and implementation.
3. Require final production architecture or deployment ownership. That sacrifices legitimate shared delivery and junior/design builders.
4. Exclude internships, IT, customer-facing work or demanding SWE backgrounds. That contradicts approved examples and closes off valid focus areas.
5. Add an Apollo-specific acceptance exception. That fits the answer key without explaining the category.

No further defensible general rule was found that fixes the remaining mismatch while preserving the reviewed boundaries. This is a stopping point for policy development on the available evidence, not proof that the prompt cannot improve on an independent run. The next useful evidence is an isolated execution of this frozen candidate and a separate generalization check—not additional edits whose only purpose is to force 33/33.

## Implementation and verification

- Versioned policies, target-employer example exclusion and small response constructors are in `apps/board/src/builder-prompt.ts`. v7 and v8 remain unchanged. The production/publishing scorer was not switched.
- `research/scripts/record-in-thread-prompt-iterations.ts` records and mechanically scores the authored reviews. It makes no model calls. The per-version JSON files retain source and prompt hashes, all 33 decisions, changed-assessment provenance and disagreements.
- `builder-prompt-iteration-review-2026-10-29.json` records the selected candidate, rejected directions, Figma guard and metadata-only coverage.
- Verification: board tests and TypeScript checks; see the task response for final test counts.

No new dependency or subscription was introduced. The paid API ledger was not used or changed. Recurring collection remains disabled and no public launch occurred.
