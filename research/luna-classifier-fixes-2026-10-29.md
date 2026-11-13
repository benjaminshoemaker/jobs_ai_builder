# Classifier fixes and same-example reruns — October 29, 2026

Quote-copying failures are removed from the board assessment path. Excessive abstention is substantially reduced; semantic classification is still imperfect.

| User label | Cases | Accepted before → after | Rejected before → after | Uncertain before → after | Invalid before → after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Approved | 29 | 18 → 27 | 0 → 1 | 5 → 1 | 6 → 0 |
| Rejected | 4 | 0 → 0 | 0 → 4 | 4 → 0 | 0 → 0 |

## What changed

- Evidence selection now uses schema-enumerated source passage IDs. Code returns original contiguous source slices, preserving exact evidence fidelity. Unknown/duplicate IDs and insufficient positive evidence remain errors. The legacy literal-quote mode remains available to CLI callers; board workers explicitly opt into the new mode.
- Decision rules reject a clear conventional PM, player/coach engineering director or IT-support mandate before considering missing evidence. Positives no longer need repeated mandatory AI language, sole product authority, independent senior scope or no engineering collaboration.
- The user-confirmed forward-deployed overlap is explicit: user discovery, personal building and learning carried into the core product can establish fit. Customer implementation alone remains insufficient.
- New structured responses separate fit (`builder`, `exclude`, `unclear`, `stretch`) from open focus tags. Old positive combined types can be safely normalized when replayed; they do not impose a closed software-engineering focus vocabulary.

## How the runs were performed

1. V4 ran all 33 cases and had no quote or other validation failures. It accepted 27 positives and rejected all four negatives, but newly rejected Apollo and TRM.
2. V5 restored the broader user-to-product feedback criterion and ran all 33 unchanged cases again. It recovered TRM, accepted 26 positives, rejected Apollo, marked OpenArt as stretch, and had one non-quote validation failure caused by an old fit/focus category mismatch.
3. V6 constrained fit and focus independently, then retried only that failed ITS Logistics case. It passed. The combined table above uses V5 outcomes plus that one V6 recovery. No retry was selected because its classification disagreed with the user. This is not a claim of a fresh full 33-case V6 evaluation.

Both full reruns verify that case IDs, expected labels, source hashes, full-input hashes and employer-family-leave-out contexts are unchanged from V3. Target-employer examples and labels remain excluded from each prompt. Prompt rules were tuned using these examples, so results are regression/calibration evidence rather than an independent accuracy estimate.

## Remaining disagreements

- **Apollo — Principal Product Builder, Data:** model returns No. The captured description emphasizes AI-native prototyping within a principal PM mandate. This disagrees with the historical approval; the exact original reviewed text is not available for a version comparison.
- **OpenArt — Early Adopter & Product Builder Intern, Creative AI:** model returns stretch because central personal implementation is unclear in the captured description. Historical approval is preserved. It was accepted in V4 and uncertain in V5, so this is also evidence of sensitivity to the decision framing.

No new user review is required to establish these known disagreements. Neither historical judgment was overwritten.

## Per-role outcomes

| Company | Role | User label | Final recorded fit | Result provenance |
| --- | --- | --- | --- | --- |
| getsquire | Director, Data Engineering | no | exclude | V5 full rerun |
| azul | IT Intern, AI and Operations | no | exclude | V5 full rerun |
| cssmerge | Product Manager - Robotic Kitchen | no | exclude | V5 full rerun |
| opensesame | Systems Administrator  | no | exclude | V5 full rerun |
| Alaffia | AI Transformation Lead | yes | operations_builder | V5 full rerun |
| Alt | Product Builder, Growth | yes | engineering_builder | V5 full rerun |
| Amperity | Principal Product Builder | yes | builder | V5 full rerun |
| Apollo | Principal Product Builder, Data | yes | exclude | V5 full rerun |
| Axiad | Principal Product Builder | yes | builder | V5 full rerun |
| ITS Logistics | AI Builder | yes | builder | V6 validation recovery |
| OpenArt | Early Adopter & Product Builder Intern, Creative AI | yes | stretch | V5 full rerun |
| RK Logistics Group | AI Product Builder | yes | operations_builder | V5 full rerun |
| AwardSpring | Product Builder Intern | yes | engineering_blend | V5 full rerun |
| TRM Labs | Forward Deployed Engineer, U.S. National Security | yes | engineering_builder | V5 full rerun |
| OpenSesame | AI Product Builder Intern | yes | builder | V5 full rerun |
| Sekai | AI Product Engineer | yes | builder | V5 full rerun |
| Faros | Product Manager, AI Native Initiatives | yes | product_builder | V5 full rerun |
| Babylist | Staff Product Designer (AI Builder) | yes | builder | V5 full rerun |
| Faros | AI-Native Builder | yes | builder | V5 full rerun |
| EarnIn | Senior Product Builder | yes | engineering_blend | V5 full rerun |
| Exiger | AI Product Builder | yes | builder | V5 full rerun |
| Figma | Product Builder, AI Insights | yes | builder | V5 full rerun |
| G2 | Senior AI Product Builder | yes | builder | V5 full rerun |
| GitLab | AI Transformation Owner, Product & Design | yes | operations_builder | V5 full rerun |
| Indeed Flex | Product Builder | yes | builder | V5 full rerun |
| MangoApps | Product Manager, AI Builder | yes | builder | V5 full rerun |
| Oath | Product Manager | yes | builder | V5 full rerun |
| Overjoy | Product Manager | yes | product_builder | V5 full rerun |
| Rillet | Business Operations, AI Builder | yes | operations_builder | V5 full rerun |
| SharkNinja | Director, Finance AI & Automation | yes | builder | V5 full rerun |
| ShipBob | Senior AI Product Builder, Inventory Experience | yes | builder | V5 full rerun |
| Veho | Director of Product, Consumer & Support (AI Builder) | yes | builder | V5 full rerun |
| Within | Senior AI Product Manager | yes | builder | V5 full rerun |

## Limits, cost and verification

The four positives without full saved descriptions remain untested: Medecision, Rivian, Vailent/Vinmar and Vanta. Positive source comparisons marked changed or unavailable remain version-drift diagnostics, not proof of the exact originally reviewed text.

Cumulative reported token usage across all runs, conservatively priced without cache discounts: approximately $0.11691. Cumulative worst-case reservations: $0.83946 of the same $1 authorization. Failed-call reservations were not refunded. These are usage estimates, not invoices.

Repository-wide tests, typechecking and builds passed after the final change. Tests cover exact source-span reconstruction, Unicode/entity handling, invalid/duplicate passage IDs, insufficient positive evidence, open focus tags with legacy positive-type replay, same-budget preflight and employer-family label exclusion. No new dependencies, public publication or recurring jobs were added.
