# Luna v12 reviewed-job regression — October 29, 2026

V12 matched all nine most recent user judgments, including OnePay Design Engineer, Medici Financial Controller, Noodle Lead Engineer and OpenArt Creative Technologist. Earlier negative boundaries remain unresolved. V12 was not promoted into the live worker.

This is a regression on known reviewed examples. The recent corrections helped shape v12, so this is not an unseen or population accuracy benchmark. Target-employer calibration examples were excluded. The target label, user rationale and previous prediction were not included in the request.

## Coverage and results

| Evidence group | Cases | Matching user label | Disagreements | Unclear | Request failures |
| --- | ---: | ---: | ---: | ---: | ---: |
| Exact saved reviewed text | 24 | 21 | 2 | 1 | 0 |
| Historical labels with unverified text pairing | 50 | 43 | 7 | 0 | 0 |

The exact-text group has 16 true positives, 5 true negatives, 2 false positives, no false negatives, and 1 abstention. Precision is 16/18 (88.9%); recall is 16/16 (100%). The abstention remains counted in the 24-case denominator. All 48 positive labels across both groups received Yes. Historical diagnostic agreements must not be presented as verified accuracy.

Two definite cases could not be evaluated: the exact brightwheel posting and Vanta Organizational Intelligence builder posting are absent from complete employer feeds and return 404 at their canonical URLs. Three previously uncertain labels (SevenAI, Extenteam, PlanetScale) were excluded from binary scoring and were not sent to the model. Of 79 retained role judgments, 76 are definite and 74 had recoverable full text.

## Remaining exact-source disagreements

- [azul — IT Intern, AI and Operations](https://jobs.lever.co/azul/8f41ceaf-8835-4fc7-ba57-9384487d59db): user **no**, model **yes**. The intern is expected to design, build, and test Claude skills and to help scope, build, deploy, and iterate on agents for real IT and Security workflows, including selecting tools and testing against real scenarios. That combines hands-on AI implementation with some solution judgment, despite senior direction.
- [opensesame — Systems Administrator ](https://boards.greenhouse.io/opensesame/jobs/8188645?gh_jid=8188645): user **no**, model **yes**. The role owns internal systems and workflow improvements, including identifying manual processes and leading their technical evaluation and implementation. It also explicitly calls for building and improving automation and AI-enabled workflows, with responsibility for operational results.
- [OnePay — Platform Engineer, Builder Experience](https://jobs.ashbyhq.com/oneapp/fbc0f334-5613-41fc-b5d7-87f2e5a20bee): user **no**, model **unclear**. The role clearly builds platform services, developer tools, and agentic frameworks using an agentic-development environment. It does not establish whether the engineer is responsible for identifying and shaping developer problems and choosing solutions, or primarily implementing technical enhancements.

The two false positives now pass the operational-workflow language introduced after the Medici feedback. That does not override their user labels, and no unsupported rationale for those rejections has been invented. The next useful clarification is what makes those IT roles different from the accepted domain-workflow mandate. OnePay Platform Engineer remains unresolved in the prompt; OnePay Design Engineer is correctly accepted.

## Historical diagnostic disagreements

- [Cyvl — Forward Deployed Engineer](https://jobs.ashbyhq.com/cyvl/0e848342-babd-4ff7-834e-ca4b7c710f75): historical user **no**, model **yes**. The role combines understanding agency workflows and surfacing unmet needs with personally building and deploying custom outputs and integrations using AI coding tools and Cyvl’s API, then owning adoption and outcomes.
- [Docker — Staff Software Engineer, AI Developer Tools](https://jobs.ashbyhq.com/docker/87bda848-01ed-4641-beaa-829373d0ed56): historical user **no**, model **yes**. The role explicitly owns clarifying ambiguous user and business problems, exercising developer-product judgment, and personally designing, building, and operating production AI tools and platform capabilities. It also requires shipping and iterating on useful solutions based on real adoption and operational results.
- [Form Energy — Staff Forward Deployed Engineer](https://jobs.ashbyhq.com/formenergy/b271995b-a17b-4153-abf2-f1ab4c2283f2): historical user **no**, model **yes**. The role explicitly owns identifying and prioritizing high-leverage problems with embedded teams, then personally building, shipping, and iterating AI-enabled software and workflows with users. It owns outcomes through production and adoption.
- [g2 — Associate GTM Engineer](https://jobs.ashbyhq.com/g2/187a60bb-94fd-4127-bddd-a8c26ae6dec1): historical user **no**, model **yes**. The role personally builds, tests, ships, and iterates AI-powered GTM workflows, then rolls them out and tracks business results. It also includes working with GTM teams to understand requests and applying outcome- and UX-based solution judgment, with senior guidance on scope and priorities.
- [figma — Sales Operations Manager](https://boards.greenhouse.io/figma/jobs/6235320004?gh_jid=6235320004): historical user **no**, model **yes**. The role owns sales-operations problems and is expected to build and maintain AI-enabled intelligence systems and deploy workflows that improve forecasting and other processes. Its responsibility to analyze performance and surface actionable improvements supplies the problem judgment as well as implementation mandate.
- [Legion Health — Founding Product Manager](https://jobs.ashbyhq.com/legionhealth/0ffded39-1242-4a35-9bc3-0e5b0ce22276): historical user **no**, model **yes**. Owns patient problems and product decisions across the care journey, then prototypes and regularly ships production PRs using AI-enabled tools, measuring outcomes and iterating with users and clinical/operations teams.
- [Toast — GTM Engineer](https://careers.toasttab.com/jobs/gtm-engineer-sales-workflow-automation-revenue-intelligence-remote-united-states): historical user **no**, model **yes**. The role owns identifying and automating sales-workflow needs, personally building LLM-powered agents and integrations from prototype through production, and improving them based on rep adoption and sales outcomes.

Some recovered text materially differs from earlier conversational descriptions. For example, the current Legion posting explicitly requires production PRs, whereas the earlier rejection said the PM did not ship code. With no original full text, a disagreement cannot be cleanly attributed to classifier behavior, source change, or an evolving boundary. All existing human labels remain authoritative.

## Spending and operation

74 new Luna Responses API calls, medium reasoning, 2,000 maximum output tokens, no automatic retries. Maximum new reservations: $0.64320745. Including the prior 20-job test, the same $5 allowance now has $0.8027542 reserved and $4.1972458 unreserved. The aggregate uncached-token estimate is $0.0367705; it does not reconcile cache-write charges or constitute an invoice. Reservations include conservative cache-write coverage.

The runner persists source/prompt/request hashes and results per case, reserves before each billable transmission under a database lock, and resumes existing results without resending interrupted calls. Public source recovery used 26 reserved HTTP requests plus one rendered browser visit for Vinmar. Four generic employer pages were parsed from their job-description containers or exact-ID structured data; Vinmar was transcribed from the full rendered employer description and requirements. All five are historical diagnostics, not exact original-text evaluations. No candidate labels, job assessments, publications, schedules or live prompt selection were changed.

## Every prediction

| Case | Company / role | User | Luna | Evidence |
| --- | --- | --- | --- | --- |
| historical:batch1_c43 | [Rillet — Product Manager](https://jobs.ashbyhq.com/rillet/a182464e-76c1-4f0b-af78-76ba8a611281) | no | no | historical_diagnostic |
| historical:cloudzero | [CloudZero — Senior/Staff PM, Agentic Practice](https://jobs.ashbyhq.com/CloudZero/9a295df8-1e90-43df-b903-b01eabc3e240) | no | no | historical_diagnostic |
| historical:cyvl | [Cyvl — Forward Deployed Engineer](https://jobs.ashbyhq.com/cyvl/0e848342-babd-4ff7-834e-ca4b7c710f75) | no | yes | historical_diagnostic |
| historical:docker | [Docker — Staff Software Engineer, AI Developer Tools](https://jobs.ashbyhq.com/docker/87bda848-01ed-4641-beaa-829373d0ed56) | no | yes | historical_diagnostic |
| historical:form | [Form Energy — Staff Forward Deployed Engineer](https://jobs.ashbyhq.com/formenergy/b271995b-a17b-4153-abf2-f1ab4c2283f2) | no | yes | historical_diagnostic |
| historical:fresh_20261028_n01 | [g2 — Associate GTM Engineer](https://jobs.ashbyhq.com/g2/187a60bb-94fd-4127-bddd-a8c26ae6dec1) | no | yes | historical_diagnostic |
| historical:fresh_20261028_n02 | [figma — Sales Operations Manager](https://boards.greenhouse.io/figma/jobs/6235320004?gh_jid=6235320004) | no | yes | historical_diagnostic |
| historical:fresh_20261028_n03 | [vanta — Staff Product Designer, Activation](https://jobs.ashbyhq.com/vanta/7d9922bb-2d0e-4833-bc4e-df65dc57d232) | no | no | historical_diagnostic |
| historical:fresh_20261028_n04 | [trm-labs — Deployment Strategist, National Security](https://jobs.ashbyhq.com/trm-labs/369c6fb3-6214-478e-870e-f57d3b234481) | no | no | historical_diagnostic |
| historical:fresh_20261028_n05 | [openart — B2B Lifecycle Marketing Manager](https://jobs.ashbyhq.com/openart/069aefb9-3103-4e07-9485-d5f66f5f4d01) | no | no | historical_diagnostic |
| historical:fresh_20261028_n06 | [figma — Manager, Software Engineering - UX Platform](https://boards.greenhouse.io/figma/jobs/6237757004?gh_jid=6237757004) | no | no | historical_diagnostic |
| historical:fresh_20261028_n07 | [figma — PhD Intern, Security Engineer (2027)](https://boards.greenhouse.io/figma/jobs/6238015004?gh_jid=6238015004) | no | no | historical_diagnostic |
| historical:fresh_20261028_n08 | [trm-labs — Enablement Manager, Public Sector](https://jobs.ashbyhq.com/trm-labs/56b079fd-2ca5-4a65-8f3f-e63ae8073d36) | no | no | historical_diagnostic |
| historical:fresh_20261028_n09 | [earnin — Head of Communications](https://job-boards.greenhouse.io/earnin/jobs/8329516) | no | no | historical_diagnostic |
| historical:fresh_20261028_n10 | [veho-tech-inc — Warehouse Associate II, Ground Operations](https://jobs.ashbyhq.com/veho-tech-inc/5770ec09-a538-4f2f-958a-5dbfc9eaddcd) | no | no | historical_diagnostic |
| historical:legion | [Legion Health — Founding Product Manager](https://jobs.ashbyhq.com/legionhealth/0ffded39-1242-4a35-9bc3-0e5b0ce22276) | no | yes | historical_diagnostic |
| historical:medecision | [Medecision — AI Product Builder](https://recruiting.paylocity.com/Recruiting/Jobs/Details/4571394) | yes | yes | historical_diagnostic |
| historical:rivian | [Rivian — AI Product Engineer, Facilities](https://careers.rivian.com/careers-home/jobs/34304?lang=en-US) | yes | yes | historical_diagnostic |
| historical:rwe | [RWE — Senior Product Manager, AI Transformation](https://jobs.rwe.com/RWE/job/Austin-Sr-Product-Manager%2C-AI-Transformation-TX-78701/1415821833/) | no | no | historical_diagnostic |
| historical:toast | [Toast — GTM Engineer](https://careers.toasttab.com/jobs/gtm-engineer-sales-workflow-automation-revenue-intelligence-remote-united-states) | no | yes | historical_diagnostic |
| historical:vailent | [Vailent/Vinmar — Builder (Product Led)](https://apply.workable.com/vinmar-international/j/386FDF1309/) | yes | yes | historical_diagnostic |
| prior:65c30d5f2a8fabb4e8631904aabc177e | [getsquire — Director, Data Engineering](https://jobs.lever.co/getsquire/2c9762e7-b7a1-4d76-b0a5-468a8b6a3c5e) | no | no | exact_reviewed |
| prior:8fe2124691866e8b9c1bf3a95887a3dd | [azul — IT Intern, AI and Operations](https://jobs.lever.co/azul/8f41ceaf-8835-4fc7-ba57-9384487d59db) | no | yes | exact_reviewed |
| prior:alaffia | [Alaffia — AI Transformation Lead](https://careers.kula.ai/alaffia/33849-ai-transformation-lead) | yes | yes | historical_diagnostic |
| prior:alt | [Alt — Product Builder, Growth](https://jobs.ashbyhq.com/alt/62bdcbde-df4a-4d2c-bd01-0560d86b387c) | yes | yes | historical_diagnostic |
| prior:amperity | [Amperity — Principal Product Builder](https://amperity.com/careers/8212260?gh_jid=8212260) | yes | yes | historical_diagnostic |
| prior:apollo | [Apollo — Principal Product Builder, Data](https://job-boards.greenhouse.io/apolloio/jobs/6229000004) | yes | yes | historical_diagnostic |
| prior:axiad | [Axiad — Principal Product Builder](https://job-boards.greenhouse.io/axiad/jobs/6220016004) | yes | yes | historical_diagnostic |
| prior:batch1_c01 | [ITS Logistics — AI Builder](https://job-boards.greenhouse.io/itslogisticsllc/jobs/5370389008) | yes | yes | historical_diagnostic |
| prior:batch1_c03 | [OpenArt — Early Adopter & Product Builder Intern, Creative AI](https://jobs.ashbyhq.com/openart/8dd52ba6-a5b6-40b1-95fe-50de352fa254) | yes | yes | historical_diagnostic |
| prior:batch1_c07 | [RK Logistics Group — AI Product Builder](https://recruiting.paylocity.com/Recruiting/Jobs/Details/4506881) | yes | yes | historical_diagnostic |
| prior:batch1_c08 | [AwardSpring — Product Builder Intern](https://www.awardspring.com/careers/product-builder-intern) | yes | yes | historical_diagnostic |
| prior:batch1_c20 | [TRM Labs — Forward Deployed Engineer, U.S. National Security](https://jobs.ashbyhq.com/trm-labs/e4992057-b59e-4fb3-8f18-a919497d0ba5) | yes | yes | historical_diagnostic |
| prior:batch1_c27 | [OpenSesame — AI Product Builder Intern](https://boards.greenhouse.io/opensesame/jobs/8313424?gh_jid=8313424) | yes | yes | historical_diagnostic |
| prior:batch1_c29 | [Sekai — AI Product Engineer](https://jobs.ashbyhq.com/sekai/3b727ebd-b3d3-4f32-a955-c4aa57f8e14f) | yes | yes | historical_diagnostic |
| prior:batch1_c46 | [Faros — Product Manager, AI Native Initiatives](https://jobs.ashbyhq.com/faros-ai/11413be9-77d0-40e7-957a-687c347146d6) | yes | yes | historical_diagnostic |
| prior:batch1_c50 | [Babylist — Staff Product Designer (AI Builder)](https://job-boards.greenhouse.io/babylist/jobs/5831620004) | yes | yes | historical_diagnostic |
| prior:batch1_c52 | [Faros — AI-Native Builder](https://jobs.ashbyhq.com/faros-ai/f0978123-07f9-457e-9236-dc136ac1c0e7) | yes | yes | historical_diagnostic |
| prior:c1d22788c9cb215c409c26b711293492 | [cssmerge — Product Manager - Robotic Kitchen](https://job-boards.greenhouse.io/cssmerge/jobs/8904230002) | no | no | exact_reviewed |
| prior:e2a8aabf6a823e1ff1966fb93c1a2b8e | [opensesame — Systems Administrator ](https://boards.greenhouse.io/opensesame/jobs/8188645?gh_jid=8188645) | no | yes | exact_reviewed |
| prior:earnin | [EarnIn — Senior Product Builder](https://job-boards.greenhouse.io/earnin/jobs/8261686) | yes | yes | historical_diagnostic |
| prior:exiger | [Exiger — AI Product Builder](https://www.exiger.com/careers/6202657004?gh_jid=6202657004) | yes | yes | historical_diagnostic |
| prior:figma_ai_insights | [Figma — Product Builder, AI Insights](https://job-boards.greenhouse.io/figma/jobs/6227402004?gh_jid=6227402004) | yes | yes | historical_diagnostic |
| prior:g2 | [G2 — Senior AI Product Builder](https://jobs.ashbyhq.com/g2/92dc2275-115f-4676-a607-fdda964e8121) | yes | yes | historical_diagnostic |
| prior:gitlab | [GitLab — AI Transformation Owner, Product & Design](https://job-boards.greenhouse.io/gitlab/jobs/8716179002) | yes | yes | historical_diagnostic |
| prior:indeed | [Indeed Flex — Product Builder](https://job-boards.eu.greenhouse.io/indeedflex/jobs/4994921101) | yes | yes | historical_diagnostic |
| prior:mangoapps | [MangoApps — Product Manager, AI Builder](https://hq.workforce.mangoapps.com/apps/job_board/public/jobs/472) | yes | yes | historical_diagnostic |
| prior:oath | [Oath — Product Manager](https://jobs.ashbyhq.com/oath/1ff90c8e-192a-4921-ba9d-89c74344c28e) | yes | yes | historical_diagnostic |
| prior:overjoy | [Overjoy — Product Manager](https://jobs.overjoy.ai/40195) | yes | yes | historical_diagnostic |
| prior:rillet | [Rillet — Business Operations, AI Builder](https://jobs.ashbyhq.com/rillet/f8d4f207-1e14-49fc-a0aa-a997a0c9bc2c) | yes | yes | historical_diagnostic |
| prior:sharkninja | [SharkNinja — Director, Finance AI & Automation](https://job-boards.greenhouse.io/sharkninjaoperatingllc/jobs/4709349006) | yes | yes | historical_diagnostic |
| prior:shipbob | [ShipBob — Senior AI Product Builder, Inventory Experience](https://job-boards.greenhouse.io/shipbobinc/jobs/4725934005) | yes | yes | historical_diagnostic |
| prior:veho | [Veho — Director of Product, Consumer & Support (AI Builder)](https://jobs.ashbyhq.com/veho-tech-inc/58699c81-9b9a-473d-9455-c1a93ef0c6d3) | yes | yes | historical_diagnostic |
| prior:within | [Within — Senior AI Product Manager](https://jobs.ashbyhq.com/within.ai/6886702a-4e88-4cc1-9f71-04b690aefb9a) | yes | yes | historical_diagnostic |
| v10:T01 | [Artera — Associate AI Builder](https://jobs.lever.co/artera-2/eae88c70-fbf5-4525-890c-d3f9377418b0) | yes | yes | exact_reviewed |
| v10:T02 | [BioRender — Product Builder](https://jobs.ashbyhq.com/biorender-inc/6e7f4b8d-f068-4d11-964d-da74b1c53b8c) | yes | yes | exact_reviewed |
| v10:T03 | [Fluidstack — Product Engineer, Business Operations](https://jobs.ashbyhq.com/fluidstack/0337be3a-3844-4832-9078-b098bdefd736) | yes | yes | exact_reviewed |
| v10:T04 | [Alt — Lead Design Builder: Marketplace](https://jobs.ashbyhq.com/alt/f049b9f7-26eb-4f92-8ca6-6ab9ae31c0f1) | yes | yes | exact_reviewed |
| v10:T05 | [Level AI — Revenue Operations Architect — GTM Systems Builder](https://jobs.ashbyhq.com/level-ai/ba2b8d96-a353-4cbe-a3ef-0cb749781dcd) | yes | yes | exact_reviewed |
| v10:T06 | [Kettle — Senior Creative Technologist](https://job-boards.greenhouse.io/kettle/jobs/8885210002) | yes | yes | exact_reviewed |
| v10:T08 | [Ramp — Design Engineer](https://jobs.ashbyhq.com/ramp/b68aca53-16c0-4ced-ab1d-e8beb2940b4f) | yes | yes | exact_reviewed |
| v10:T09 | [MongoDB — Staff Product Manager, AI Builder Experience](https://www.mongodb.com/careers/job/?gh_jid=8129885) | no | no | exact_reviewed |
| v10:T10 | [OnePay — Platform Engineer, Builder Experience](https://jobs.ashbyhq.com/oneapp/fbc0f334-5613-41fc-b5d7-87f2e5a20bee) | no | unclear | exact_reviewed |
| v10:T11 | [HomeSmart Services — Forward Deployed Engineer — Applied AI](https://homesmartservices.bamboohr.com/careers/1116) | yes | yes | exact_reviewed |
| v10:T12 | [Onos Health — Senior Product Engineer](https://jobs.ashbyhq.com/onoshealth/58d36bae-5153-471a-9c8c-2094339be001) | yes | yes | exact_reviewed |
| v11:L04 | [Alt — Product Builder, Vault](https://jobs.ashbyhq.com/alt/52317979-235e-4b3f-b7a7-27d5e68d3bcf) | yes | yes | exact_reviewed |
| v11:L07 | [Fluidstack — Product Engineer, Compute Operations](https://jobs.ashbyhq.com/fluidstack/a59fc19b-ce9d-45ba-b303-58ec58ac6199) | yes | yes | exact_reviewed |
| v11:L09 | [lever:noodle — Lead Engineer, Engineering (EDge Product Suite)](https://jobs.lever.co/noodle/2f3a7bbe-00c7-415a-9a29-749c080d92ed) | no | no | exact_reviewed |
| v11:L10 | [ashby:clera — Product Engineer, Consumer](https://jobs.ashbyhq.com/clera/b6f95627-eecd-4931-89ec-f92d05b49ac5) | yes | yes | exact_reviewed |
| v11:L12 | [lever:medi.ci — Financial Controller](https://jobs.lever.co/medi.ci/9cf64e54-9f22-48a5-96dc-cb2a1ba907bf) | yes | yes | exact_reviewed |
| v11:L13 | [Artera — AI Builder](https://jobs.lever.co/artera-2/66019d50-3ae7-490e-9d64-6d4ad7e60ad4) | yes | yes | exact_reviewed |
| v11:L16 | [OnePay — Design Engineer](https://jobs.ashbyhq.com/oneapp/b7ae2b9b-0f31-468d-9ac8-395536da8beb) | yes | yes | exact_reviewed |
| v11:L19 | [ashby:openart — Creative Technologist (AI Design Engineer)](https://jobs.ashbyhq.com/openart/48ee704c-6c89-4287-8f90-c88e1416f326) | yes | yes | exact_reviewed |
| v11:L20 | [greenhouse:mrbeastyoutube — Senior Product Manager ](https://job-boards.greenhouse.io/mrbeastyoutube/jobs/6123291004) | no | no | exact_reviewed |
