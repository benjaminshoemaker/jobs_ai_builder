# Luna regression against user-reviewed roles — October 29, 2026

The revised classifier is not ready for automatic classification. It retained 18 of 29 historical positives with full saved descriptions, abstained on five, and failed exact-source-quote validation on six. All four new negatives became uncertain, not explicit No decisions. No new positive classification occurred on these four negatives, but that is not equivalent to learning their rejection boundary.

| Expected from user | Cases attempted | Yes | No | Uncertain | Invalid response |
| --- | ---: | ---: | ---: | ---: | ---: |
| Approved historical roles | 29 | 18 | 0 | 5 | 6 |
| New negatives | 4 | 0 | 0 | 4 | 0 |

## What the failures show

- Alt, OpenArt, AwardSpring, Sekai and EarnIn were marked uncertain despite historical approval. Alt is internally inconsistent: its AI summary recognizes explicit AI-assisted implementation while its reason says AI use is insufficiently established.
- Axiad, OpenSesame AI Product Builder Intern, Figma AI Insights, MangoApps, Overjoy and ShipBob failed the exact contiguous evidence-quote check. These are operational failures, not rejected roles; malformed evidence was not accepted.
- The four new negatives were all abstentions. In particular the revised classifier still reasons largely about missing AI-as-building-tool evidence, rather than consistently recognizing the traditional PM/player-coach mandates the user rejected.
- Strong retained positives span product, operations, design and engineering overlaps, including Amperity, TRM, Babylist, Rillet, Indeed Flex and GitLab.

## Test method and limits

- Same GPT-6 Luna, low reasoning, strict output schema and source-quote validation as the manual assessment worker. The shared default definition is now generic and versioned as builder-feedback-v3; specific employer hints were removed.
- For each case, that employer family and cross-referenced labels were excluded from the prompt. Expected labels were used only after inference. Remaining historical examples and eligible calibration feedback were retained. Target prompt contexts are stored immutably by hash in the private database.
- This is regression diagnosis on previously reviewed examples, not an independent unseen-job accuracy benchmark. The rules themselves were informed by these examples.
- Positive expectations are historical judgments. Only one saved positive description is recorded as identical to the historical source; changed and unavailable comparisons are visible below, so disagreements cannot all be attributed confidently to model regression.
- Four positives have no full saved description and were not inferred from titles or previous summaries: Medecision, Rivian, Vailent/Vinmar, Vanta.
- Source versions, prompt/context hashes, request results and exclusions are frozen in the companion JSON and private regression ledger. New results do not overwrite user labels, alter the published board, or enable recurring runs.

## All tested roles

| Company | Role | User label | Model result | Source comparison |
| --- | --- | --- | --- | --- |
| getsquire | [Director, Data Engineering](https://jobs.lever.co/getsquire/2c9762e7-b7a1-4d76-b0a5-468a8b6a3c5e) | no | Uncertain | exact_user_reviewed_version |
| azul | [IT Intern, AI and Operations](https://jobs.lever.co/azul/8f41ceaf-8835-4fc7-ba57-9384487d59db) | no | Uncertain | exact_user_reviewed_version |
| cssmerge | [Product Manager - Robotic Kitchen](https://job-boards.greenhouse.io/cssmerge/jobs/8904230002) | no | Uncertain | exact_user_reviewed_version |
| opensesame | [Systems Administrator ](https://boards.greenhouse.io/opensesame/jobs/8188645?gh_jid=8188645) | no | Uncertain | exact_user_reviewed_version |
| Alaffia | [AI Transformation Lead](https://careers.kula.ai/alaffia/33849-ai-transformation-lead) | yes | Yes | not_available |
| Alt | [Product Builder, Growth](https://jobs.ashbyhq.com/alt/62bdcbde-df4a-4d2c-bd01-0560d86b387c) | yes | Uncertain | not_available |
| Amperity | [Principal Product Builder](https://amperity.com/careers/8212260?gh_jid=8212260) | yes | Yes | not_available |
| Apollo | [Principal Product Builder, Data](https://job-boards.greenhouse.io/apolloio/jobs/6229000004) | yes | Yes | not_available |
| Axiad | [Principal Product Builder](https://job-boards.greenhouse.io/axiad/jobs/6220016004) | yes | Invalid evidence quote | not_available |
| ITS Logistics | [AI Builder](https://job-boards.greenhouse.io/itslogisticsllc/jobs/5370389008) | yes | Yes | not_available |
| OpenArt | [Early Adopter & Product Builder Intern, Creative AI](https://jobs.ashbyhq.com/openart/8dd52ba6-a5b6-40b1-95fe-50de352fa254) | yes | Uncertain | not_available |
| RK Logistics Group | [AI Product Builder](https://recruiting.paylocity.com/Recruiting/Jobs/Details/4506881) | yes | Yes | not_available |
| AwardSpring | [Product Builder Intern](https://www.awardspring.com/careers/product-builder-intern) | yes | Uncertain (stretch) | not_available |
| TRM Labs | [Forward Deployed Engineer, U.S. National Security](https://jobs.ashbyhq.com/trm-labs/e4992057-b59e-4fb3-8f18-a919497d0ba5) | yes | Yes | changed |
| OpenSesame | [AI Product Builder Intern](https://boards.greenhouse.io/opensesame/jobs/8313424?gh_jid=8313424) | yes | Invalid evidence quote | not_available |
| Sekai | [AI Product Engineer](https://jobs.ashbyhq.com/sekai/3b727ebd-b3d3-4f32-a955-c4aa57f8e14f) | yes | Uncertain | not_available |
| Faros | [Product Manager, AI Native Initiatives](https://jobs.ashbyhq.com/faros-ai/11413be9-77d0-40e7-957a-687c347146d6) | yes | Yes | not_available |
| Babylist | [Staff Product Designer (AI Builder)](https://job-boards.greenhouse.io/babylist/jobs/5831620004) | yes | Yes | changed |
| Faros | [AI-Native Builder](https://jobs.ashbyhq.com/faros-ai/f0978123-07f9-457e-9236-dc136ac1c0e7) | yes | Yes | changed |
| EarnIn | [Senior Product Builder](https://job-boards.greenhouse.io/earnin/jobs/8261686) | yes | Uncertain | not_available |
| Exiger | [AI Product Builder](https://www.exiger.com/careers/6202657004?gh_jid=6202657004) | yes | Yes | not_available |
| Figma | [Product Builder, AI Insights](https://job-boards.greenhouse.io/figma/jobs/6227402004?gh_jid=6227402004) | yes | Invalid evidence quote | changed |
| G2 | [Senior AI Product Builder](https://jobs.ashbyhq.com/g2/92dc2275-115f-4676-a607-fdda964e8121) | yes | Yes | not_available |
| GitLab | [AI Transformation Owner, Product & Design](https://job-boards.greenhouse.io/gitlab/jobs/8716179002) | yes | Yes | not_available |
| Indeed Flex | [Product Builder](https://job-boards.eu.greenhouse.io/indeedflex/jobs/4994921101) | yes | Yes | not_available |
| MangoApps | [Product Manager, AI Builder](https://hq.workforce.mangoapps.com/apps/job_board/public/jobs/472) | yes | Invalid evidence quote | not_available |
| Oath | [Product Manager](https://jobs.ashbyhq.com/oath/1ff90c8e-192a-4921-ba9d-89c74344c28e) | yes | Yes | not_available |
| Overjoy | [Product Manager](https://jobs.overjoy.ai/40195) | yes | Invalid evidence quote | identical |
| Rillet | [Business Operations, AI Builder](https://jobs.ashbyhq.com/rillet/f8d4f207-1e14-49fc-a0aa-a997a0c9bc2c) | yes | Yes | changed |
| SharkNinja | [Director, Finance AI & Automation](https://job-boards.greenhouse.io/sharkninjaoperatingllc/jobs/4709349006) | yes | Yes | not_available |
| ShipBob | [Senior AI Product Builder, Inventory Experience](https://job-boards.greenhouse.io/shipbobinc/jobs/4725934005) | yes | Invalid evidence quote | not_available |
| Veho | [Director of Product, Consumer & Support (AI Builder)](https://jobs.ashbyhq.com/veho-tech-inc/58699c81-9b9a-473d-9455-c1a93ef0c6d3) | yes | Yes | not_available |
| Within | [Senior AI Product Manager](https://jobs.ashbyhq.com/within.ai/6886702a-4e88-4cc1-9f71-04b690aefb9a) | yes | Yes | not_available |

## Cost and verification

This run made 33 additional requests. Across both the initial trial and this regression, reported token usage priced entirely as uncached totals approximately $0.04872; conservative reservations total $0.35269 against the same cumulative $1 authorization. These are usage-based estimates, not provider invoices.

Repository tests, typechecking and builds passed. Added tests verify employer-family label exclusion, budget exhaustion preventing API transmission, and reservation persistence before transmission.

## Next iteration

Fix and diagnose quote extraction without weakening source fidelity, and address over-abstention on known positives. Preserve the explicit AI-assisted-building and overall-mandate boundaries; do not require the posting to repeat the AI evidence throughout the responsibilities. Repeat failed cases as separately versioned diagnostics, rather than silently dropping them from metrics or treating uncertain as a correct No. No further user labeling is needed to identify these issues.
