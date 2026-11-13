# Builder v8: in-thread regression review

Reviewed October 29, 2026. No paid API calls. No database writes, production changes, or recurring jobs.

## Execution and limits

The requested standalone Codex CLI experiment could not run: CLI 0.142.5 reported ChatGPT login, but rejected the exact requested `gpt-6.1-sol` model with `model_not_found` / “not supported when using Codex with a ChatGPT account.” The probe removed both API-key environment variables. No substitute model was used.

The assistant instead read all 33 full normalized frozen descriptions directly in the existing desktop thread and authored assessments against builder-fit-v8. The model selection is the user-reported GPT-6.1 Sol selection in this thread; it was not independently verified from CLI execution metadata. This is an in-thread regression review, not 33 isolated executions of the prompt. The conversation already contains labels, examples and earlier outcomes, so these results cannot establish independent model accuracy.

The export script uses a read-only preview-database transaction, verifies exact source hashes against the frozen v3 manifest, and places descriptions in a temporary directory outside the repository. Saved results retain source hashes and reasons rather than duplicating full descriptions. The v8 policy was not changed during this review.

## Outcome

- 26 of 29 historical positives accepted; Apollo rejected; Amperity and OpenArt unclear.
- All four current-source negatives rejected: SQUIRE, Azul, Lab37 and OpenSesame Systems Administrator.
- 30/33 exact label matches; two abstentions; no assessment omissions.
- Development diagnostic precision: 26/(26+0) = 100%; recall including positive abstentions as misses: 26/29 = 89.7%. These are agreement diagnostics, not an estimate of fresh-job accuracy or real-world discovery precision.
- All 29 historical positives lack a verified original user-reviewed full-text pair for strict scoring in this manifest. The strict current-source subset contains only four negatives and cannot establish positive recall or precision.

Four historical positives could not be assessed from full saved text: Medecision, Rivian, Vailent/Vinmar and Vanta. The 33-case suite is the previously frozen regression suite, not every historical negative or every judgment ever supplied.

## Disagreements

- **Amperity — Principal Product Builder**: saved Yes; current review **unclear**. The posting requires direct experience building agentic systems and rapid AI prototypes in the codebase, but does not clearly establish whether personally implementing usable solutions is central to this role or primarily validates ideas for engineering. Source comparison: `not_available`.
- **Apollo — Principal Product Builder, Data**: saved Yes; current review **no**. The detailed mandate is product strategy, sourcing, telemetry and cross-functional delivery. Personal AI work is explicitly prototyping to validate before investment; the posting does not establish a central personal implementation-and-shipping responsibility. Source comparison: `not_available`.
- **OpenArt — Early Adopter & Product Builder Intern, Creative AI**: saved Yes; current review **unclear**. The intern personally prototypes feature ideas and works with designers and engineers to ship them, but it is unclear whether AI-assisted implementation of usable software is part of that personal mandate rather than concept exploration and creative-AI product testing. Source comparison: `not_available`.

## All results

| Company | Role | Saved label | In-thread assessment |
| --- | --- | --- | --- |
| getsquire | Director, Data Engineering | no | no |
| azul | IT Intern, AI and Operations | no | no |
| cssmerge | Product Manager - Robotic Kitchen | no | no |
| opensesame | Systems Administrator | no | no |
| Alaffia | AI Transformation Lead | yes | yes |
| Alt | Product Builder, Growth | yes | yes |
| Amperity | Principal Product Builder | yes | unclear |
| Apollo | Principal Product Builder, Data | yes | no |
| Axiad | Principal Product Builder | yes | yes |
| ITS Logistics | AI Builder | yes | yes |
| OpenArt | Early Adopter & Product Builder Intern, Creative AI | yes | unclear |
| RK Logistics Group | AI Product Builder | yes | yes |
| AwardSpring | Product Builder Intern | yes | yes |
| TRM Labs | Forward Deployed Engineer, U.S. National Security | yes | yes |
| OpenSesame | AI Product Builder Intern | yes | yes |
| Sekai | AI Product Engineer | yes | yes |
| Faros | Product Manager, AI Native Initiatives | yes | yes |
| Babylist | Staff Product Designer (AI Builder) | yes | yes |
| Faros | AI-Native Builder | yes | yes |
| EarnIn | Senior Product Builder | yes | yes |
| Exiger | AI Product Builder | yes | yes |
| Figma | Product Builder, AI Insights | yes | yes |
| G2 | Senior AI Product Builder | yes | yes |
| GitLab | AI Transformation Owner, Product & Design | yes | yes |
| Indeed Flex | Product Builder | yes | yes |
| MangoApps | Product Manager, AI Builder | yes | yes |
| Oath | Product Manager | yes | yes |
| Overjoy | Product Manager | yes | yes |
| Rillet | Business Operations, AI Builder | yes | yes |
| SharkNinja | Director, Finance AI & Automation | yes | yes |
| ShipBob | Senior AI Product Builder, Inventory Experience | yes | yes |
| Veho | Director of Product, Consumer & Support (AI Builder) | yes | yes |
| Within | Senior AI Product Manager | yes | yes |

## Interpretation

The prompt reproduces most existing judgments during a context-aware review, while the remaining disagreements concentrate on the distinction between personally implementing usable product and prototyping alongside engineering. Preserve those disagreements rather than adding employer-specific acceptance exceptions. Current frozen descriptions may not match the text behind the original approvals.

This route supports iterative policy development without using the separate API budget. A clean quantitative GPT-6.1 Sol benchmark still requires an isolated runner with access to that exact model. No claim is made that the CLI restriction applies to the desktop thread, or that the desktop selection proves CLI availability.
