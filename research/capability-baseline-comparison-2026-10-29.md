# Criteria-only model comparison — October 29, 2026

The larger model did not resolve the two shared semantic disagreements. The clean, directly comparable subset is nine cases: both models made the same decision on all nine. Luna produced valid responses for all 15 cases. Sol had six output-limit failures in the indexed-passage format; five plain-text controls recovered valid responses, with Apollo still unresolved. These controls are not identical-format reruns, so the aggregate counts below are not a clean model ranking.

| Model | Selected | Valid decisions including format controls | Matches recorded judgment | Disagrees | Unclear | Operationally unresolved |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| gpt-6-luna | 15 | 15 | 13 | 2 | 0 | 0 |
| gpt-6.1-sol | 15 | 14 | 11 | 2 | 1 | 1 |

## Shared semantic disagreements

**Lab37 — Product Manager, Robotic Kitchen: both Yes; user No.** Both models treat mandatory AI-built MVPs, real-user testing and ownership of pilots/rollout as satisfying the written building loop. The prompt explicitly allows usable working prototypes. The user instead judged this a prototyping PM role without the required building mandate. This points to an insufficiently expressed central-building threshold, not evidence that the models failed to read the AI clause.

**Azul — IT Intern, AI and Operations: both Yes; user No.** Both cite personally building/testing Claude skills and agents and iterating against real operational scenarios. The user supplied No without a reason. Do not infer a ban on internships: AwardSpring, OpenArt and OpenSesame product-builder internships were approved. The missing policy distinction must be identified rather than invented.

Both models correctly return No for SQUIRE’s engineering director and OpenSesame’s Systems Administrator in the directly comparable run.

## What this does and does not establish

- Criteria-only classification is stable across these two models on the nine successful identical-format pairs. It does not show a semantic advantage for the more expensive model.
- Luna agrees with 13/15 recorded labels; the two shared disagreements are exact-source recent negatives. This is not an unseen accuracy estimate: the set is small, deliberately selected, and most historical positive labels lack verified original source text.
- The prompt contains no historical labels or employer-specific exceptions. The criteria were informed by the user’s earlier judgments, so the experiment is diagnostic rather than pristine holdout validation.
- The original unbounded-explanation pilot was interrupted; its responses and full reservations are retained. The paired rerun bounded reasons to 1,000 characters and allowed 6,000 output tokens. Six Sol responses still reached the token ceiling.
- Plain-text controls kept the same semantic policy and source, removed passage IDs/evidence output, bounded reasons to 600 characters, and used 2,000 tokens for Amperity or 600 for the other controls. They completed in 74–267 output tokens. This is an effective workaround, but because several formatting settings changed together, it does not prove which single setting caused the truncation.
- No failed response is counted as a negative classification. No retry targeted a semantic disagreement; only operational failures were retested. Apollo was not retried under the remaining conservative budget.

## Case-by-case results

| Company | Role | Recorded label | Luna | Sol | Sol output format |
| --- | --- | --- | --- | --- | --- |
| getsquire | [Director, Data Engineering](https://jobs.lever.co/getsquire/2c9762e7-b7a1-4d76-b0a5-468a8b6a3c5e) | no | no | no | numbered_passages_and_evidence_ids |
| azul | [IT Intern, AI and Operations](https://jobs.lever.co/azul/8f41ceaf-8835-4fc7-ba57-9384487d59db) | no | yes | yes | numbered_passages_and_evidence_ids |
| cssmerge | [Product Manager - Robotic Kitchen](https://job-boards.greenhouse.io/cssmerge/jobs/8904230002) | no | yes | yes | numbered_passages_and_evidence_ids |
| opensesame | [Systems Administrator ](https://boards.greenhouse.io/opensesame/jobs/8188645?gh_jid=8188645) | no | no | no | numbered_passages_and_evidence_ids |
| Alt | [Product Builder, Growth](https://jobs.ashbyhq.com/alt/62bdcbde-df4a-4d2c-bd01-0560d86b387c) | yes | yes | yes | numbered_passages_and_evidence_ids |
| Amperity | [Principal Product Builder](https://amperity.com/careers/8212260?gh_jid=8212260) | yes | yes | unclear | plain_text_operational_recovery |
| Apollo | [Principal Product Builder, Data](https://job-boards.greenhouse.io/apolloio/jobs/6229000004) | yes | yes | operational failure | numbered_passages_and_evidence_ids |
| Axiad | [Principal Product Builder](https://job-boards.greenhouse.io/axiad/jobs/6220016004) | yes | yes | yes | plain_text_operational_recovery |
| OpenArt | [Early Adopter & Product Builder Intern, Creative AI](https://jobs.ashbyhq.com/openart/8dd52ba6-a5b6-40b1-95fe-50de352fa254) | yes | yes | yes | numbered_passages_and_evidence_ids |
| AwardSpring | [Product Builder Intern](https://www.awardspring.com/careers/product-builder-intern) | yes | yes | yes | numbered_passages_and_evidence_ids |
| TRM Labs | [Forward Deployed Engineer, U.S. National Security](https://jobs.ashbyhq.com/trm-labs/e4992057-b59e-4fb3-8f18-a919497d0ba5) | yes | yes | yes | plain_text_operational_recovery |
| Sekai | [AI Product Engineer](https://jobs.ashbyhq.com/sekai/3b727ebd-b3d3-4f32-a955-c4aa57f8e14f) | yes | yes | yes | numbered_passages_and_evidence_ids |
| Babylist | [Staff Product Designer (AI Builder)](https://job-boards.greenhouse.io/babylist/jobs/5831620004) | yes | yes | yes | plain_text_operational_recovery |
| Overjoy | [Product Manager](https://jobs.overjoy.ai/40195) | yes | yes | yes | plain_text_operational_recovery |
| Rillet | [Business Operations, AI Builder](https://jobs.ashbyhq.com/rillet/f8d4f207-1e14-49fc-a0aa-a997a0c9bc2c) | yes | yes | yes | numbered_passages_and_evidence_ids |

## Next step

Use the user’s explicit Lab37 explanation to state what is missing from prototype-only PM work, while preserving accepted collaborative builders. Ask only for the missing Azul rejection reason, comparing it with the already-approved builder internships; do not ask for another large labeling batch. Keep the criteria policy separate from focus, SWE requirements, geography and source verification.

## Authorization and verification

The user authorized a $3.60 cumulative cap and approximately 15 postings. The same 15 source versions were used throughout. Total conservative reservations, including the interrupted pilot and all operational controls, are $3.568425275. Failed/unknown reservations were not refunded. No new jobs were published and no recurring process was enabled. Tests and typechecking passed.
