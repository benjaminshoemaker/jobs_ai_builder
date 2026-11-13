# Builder board: first design pass

This is an exploration of a public, U.S.-focused board for people who use AI to personally build working software while owning the problem and learning from use. The primary reader is product-minded and may not have a professional software-engineering background. The broader builder category includes operations, design, and engineering-led roles. Role focus and prior-SWE requirement are separate.

## Job to be done

Every published role must already meet the builder definition. Within a minute, a visitor should be able to tell what they would build, what decisions they would own, where they could work, what the employer would pay if disclosed, and whether a prior SWE career is required. They should be able to open the employer posting and see when we last checked it.

## First public surface

1. A short category statement, with listings visible in the first viewport.
2. Search plus filters for work focus, prior-SWE gate, and work arrangement. Add further filters only when the inventory has reliable values for them.
3. Every listing preview shows title, employer name and logo, a single plain-language workplace line (for example, "Hybrid in NYC or SF · 3 office days/week"), employer-published compensation or "Salary not listed," work focus, prior-SWE gate, "View Role Details," and "Apply on company site."
4. Opening a role shows an on-board detail view with responsibilities, qualifications, compensation, workplace terms, and our explanation of why it qualifies. The employer posting remains the source and application destination.
5. A labeled "Not a builder job?" action lets readers challenge a listing. On the live board it should create a review item tied to the canonical posting, with a way to undo an accidental flag. The local design preview only shows a reversible flag in the current page session; it does not send feedback.
6. A concise definition page can explain the category and editorial criteria. Blog posts remain a separate workstream.

Uncertain roles should stay in the editorial queue. A confirmed builder with an unclear engineering gate may be published only if the uncertainty is stated plainly. Closed or inaccessible employer pages must not appear as verified-open roles.

## Prototype data and limits

The [visual exploration](board-concepts.html) uses six user-reviewed roles: Overjoy, Figma, Rillet, TRM Labs, Babylist, and Faros. They exercise product, operations, design, and engineering-led focus, plus open, required, and unclear prior-SWE gates. Employer pages and public employer feeds were checked on October 28, 2026. The detail views show our reviewed assessments followed by the complete employer posting text captured in [employer-descriptions.js](employer-descriptions.js). This is a dated design sample, not a continuously refreshed live board; availability and terms can change. No secrets are stored in the design artifact.

Company marks in the prototype are small local copies of icons published on each company's own website. The company name remains visible text; the icon is decorative.

## Field policy

- **Show in the preview:** the facts needed to decide whether to open a role: identity, workplace and hiring area in one readable sentence, published pay with its type, focus, SWE experience gate, and actions to view role details or apply on the company site. Building responsibilities, qualifications, and the verification date belong in role details.
- **Show in the detail view:** the complete role information needed to assess fit, including responsibilities, qualifications, compensation, benefits, workplace terms, and the evidence behind our editorial judgments. For remote jobs, distinguish where the employer can hire from where its offices are. A full employer description may be included when verified and permitted by the source; show attribution and the last check.
- **Keep at the employer:** the application form and current source of truth. Link to it prominently for applying and verifying changes.
- **Do not infer:** a salary from market estimates, a U.S. hiring area from a company's headquarters, or an SWE requirement from a technical title alone. "Not listed" means the checked employer posting did not publish the field; "not yet verified" means we have not checked it.
- **Add later if useful and reliably populated:** salary and location filters, seniority, company size, tool stack, visa sponsorship, and saved searches. A tool name is supporting context, not proof that a role qualifies.

## Inspected precedents and lessons

| Precedent | Observation | Transfer |
| --- | --- | --- |
| [HiringCafe AI Product Builder search](https://hiringcafe.com/jobs/ai-product-builder) | Dense results and extensive filters make broad search powerful, but the visible cards give qualifications and tools more space than an explanation of why a person personally builds. | Keep efficient scanning; lead each card with the builder mandate and the SWE gate. |
| [McMaster-Carr catalog](https://www.mcmaster.com/products/pipe-hangers/id~1-1-4/) | A dense catalog stays navigable through persistent filters, aligned fields, and consistent item structure. | Use a consistent information order; add filter complexity only as the board grows. |
| [Our World in Data](https://ourworldindata.org/) | A clear editorial mission sits alongside directly usable exploration. | Explain the category briefly while keeping the jobs immediately accessible. |
| [Dribbble Jobs](https://dribbble.com/jobs) | Large confident type, generous whitespace, and restrained job rows give a specialist board its own identity. | Keep the confidence and quiet scanning rhythm; shorten the hero so listings remain visible immediately, and add the role evidence Dribbble's sparse cards do not need. |
| [Welcome to the Jungle jobs](https://www.welcometothejungle.com/en-GB/jobs) | Bold yellow, large type, and rounded editorial surfaces make job search feel inviting. The current public landing page emphasizes a guided search before listings. | Test an energetic editorial direction while keeping the curated roles directly visible and avoiding a required signup or matching flow. |
| [Windelta game report](https://windelta.app/game/401873010?week=7&seasontype=2) | Cool teal rules, aligned dense rows, clear section labels, and a short explanatory summary make complex evidence scannable. | Try a report-like board where focus, qualification gate, and rationale have a fixed order. Use this as a visual principle, not as shared branding. |

These are transferable principles, not visual templates to copy.

## Comparable visual directions

All three options in the prototype use the same copy, cards, filters, and detail view.

| Direction | Visual thesis | Strength | Cost to watch |
| --- | --- | --- | --- |
| Field guide | Warm paper, serif headlines, fine rules, and edited explanations make the category feel carefully defined. | Strong editorial authority and room for nuance. | Could feel more like a publication than a daily job-search tool. |
| Signal desk | Cool neutral surfaces, teal rules, compact rows, and monospace metadata put the evidence in a repeatable order. | Fast comparison and a direct link to the user's Windelta report language. | Could feel clinical if the category story is too quiet. |
| Open studio | A warm color introduction, bold type, and rounded panels make the new role feel accessible. | Most inviting and distinctive at a glance. | The colored opening must stay short enough that jobs are visible. |

**Selected direction: Open studio with Apricot.** The warm color studies remain in the preview for comparison, but Apricot is the default. Its soft orange opening, warm cream canvas, and brown actions avoid the earlier yellow treatment. The card shows workplace and pay first, then focus and prior-SWE gate. “Apply on company site” is the filled primary button; “View Role Details” is an outlined secondary button below it on desktop and mobile. The detail view combines our assessment with the complete captured employer posting. At tablet width, filters collapse so a listing appears sooner.

The selected direction uses one sans-serif family for its interface, with a restrained type hierarchy: role title, body text, and small supporting metadata. The card reads employer and title, workplace and pay, then focus and SWE gate. Building work and qualifications appear in the detail view. The checked date is a small footnote in role details; decorative corner arrows are excluded because they compete with the text.

## Open design decisions

- Which focus and gate labels read clearly to a new visitor without prior knowledge of this project?

Next, refine the role card and detail view on desktop and mobile, then write durable design guidance. Work backward from the selected UI to the editorial record and publishing pipeline; the current legacy export does not encode the clarified public-board criteria.

## Detail-view refinement

The detail view starts with a sticky employer/action bar, then the title and a two-column facts panel (one column on mobile). A single short assessment explains inclusion. Further editorial interpretation sits in a disclosure. The full employer text is divided at its existing headings into native disclosure sections; role and qualification sections open initially, with an expand/collapse-all action. Preserve the employer’s wording and original order. Apply and Close remain available while scrolling. Verification stays in a small footnote.
