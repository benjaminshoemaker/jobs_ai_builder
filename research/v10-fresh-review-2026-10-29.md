# Fresh v10 review batch — T01–T12

## User-reviewed outcome

The user subsequently confirmed T01–T06, T08, T11 and T12 as Yes, and T09–T10 as No. All eleven definite judgments match the frozen predictions: nine positives and two negatives. T07 PlanetScale remains **Maybe**, because the user was unsure whether the role includes independently understanding the problem rather than ordinary engineering. The model's original Yes is retained; this case is neither a confirmed success nor a confirmed false positive.

The [separate user labels](v10-fresh-review-2026-10-29-user-labels.json) and [evaluation](v10-fresh-review-2026-10-29-evaluation.json) retain source hashes and the unchanged prediction artifact hash. Binary precision and recall are both 100% on the eleven definite labels, but the small selected batch does not establish that performance for discovery generally. No prompt was changed before scoring.

Outside this batch, the user reaffirmed Apollo as a candidate, citing the opening's explicit combination of product judgment, domain depth and AI-native research/execution. Record the existing Yes as reaffirmed and the earlier No as an assessment error; do not erase the frozen No or count Apollo as a fresh-batch success. See [Apollo reaffirmation](apollo-user-reaffirmation-2026-10-29.json).

The practical distinction to carry into the next candidate is evidence weighting: a role-wide hybrid-builder mandate, supported by actual personal-building requirements, is relevant even when delivery is not restated as a production-coding duty. Conversely, engineering ownership of tools or technical friction does not automatically prove independent problem framing and solution selection. A title or generic claim to be hands-on remains insufficient.

Predictions frozen before user feedback. These are new to the saved human-review set, not necessarily newly published jobs. The exact v10 policy was unchanged. The batch is a purposive challenge set, not a random sample or a population precision/recall estimate. Assessments were authored in the existing conversation, with no paid model API calls.

Employer public posting data was fetched October 29, 2026 Pacific. Ashby roles were listed in the current feed; Lever/Greenhouse returned the exact public posting IDs; HomeSmart’s public detail endpoint reported Open. BioRender explicitly includes Remote (US) as a secondary location. Alt’s hiring region is not explicit and remains unconfirmed. OneDigital was excluded because the direct API returned 403 and the page did not expose readable current content; that is not a closed-role finding.

A read-only comparison against 58 saved historical/candidate review URLs found no overlap, using posting IDs as well as canonical URLs. Prior F1–F8 review-batch IDs were excluded from the saved candidate pool. Original review labels were not copied into this batch. No jobs or new reviews were published or written to the database.

## Apollo

[Apollo — Principal Product Builder, Data](https://job-boards.greenhouse.io/apolloio/jobs/6229000004). The current employer page displayed an Apply button when checked. This is outside the fresh batch.

## Frozen predictions

### T01 — Artera: Associate AI Builder

[Employer posting](https://jobs.lever.co/artera-2/eae88c70-fbf5-4525-890c-d3f9377418b0)

**Prediction:** yes. **Focus:** product, customer_operations. **Experience gate:** explicit_non_swe_route.

**Qualifications:** 0–3 years across engineering, data science, PM, design or technical project management, or equivalent demonstrated output; fresh graduates welcome.

**Reason:** Owns customer discovery, a roadmap, personally architected and coded agentic solutions, production operation and improvement. The work goes beyond configuring an existing product.

> you yourself architect and code with our internal agentic systems.

**Boundary to review:** Customer-specific solutions overlap: inclusion rests on novel building, problem judgment and production outcomes.

### T02 — BioRender: Product Builder

[Employer posting](https://jobs.ashbyhq.com/biorender-inc/6e7f4b8d-f068-4d11-964d-da74b1c53b8c)

**Prediction:** yes. **Focus:** product, science. **Experience gate:** explicit_non_swe_route.

**Qualifications:** Biology/life-sciences/research background, familiarity with BioRender, and real AI-built projects; a software-engineering career is not required.

**Reason:** Owns discovery, personally creates features with AI coding tools and ships work real users interact with.

> you don't need to be a software expert

**Boundary to review:** Domain expertise is a substantial qualification even though professional SWE experience is not required.

### T03 — Fluidstack: Product Engineer, Business Operations

[Employer posting](https://jobs.ashbyhq.com/fluidstack/0337be3a-3844-4832-9078-b098bdefd736)

**Prediction:** yes. **Focus:** operations, engineering. **Experience gate:** technical_fluency.

**Qualifications:** Production coding in Go/Python/TypeScript, LLM APIs and agentic tools; evidence of adoption with finance, legal or people teams. No fixed SWE-year requirement stated.

**Reason:** Embeds with operational users, identifies problems, designs and ships software using AI coding tools, then drives adoption and business outcomes.

> You identify problems, design the solution, and ship it without waiting for direction or approval.

**Boundary to review:** Technically demanding: do not confuse absence of a fixed SWE-years gate with an entry-level job.

### T04 — Alt: Lead Design Builder: Marketplace

[Employer posting](https://jobs.ashbyhq.com/alt/f049b9f7-26eb-4f92-8ca6-6ab9ae31c0f1)

**Prediction:** yes. **Focus:** design, product. **Experience gate:** technical_fluency.

**Qualifications:** Strong design craft and early/founding designer or independent-building experience; code or code-adjacent AI prototyping and outcome-based portfolio.

**Reason:** Owns problem framing, user research, code prototypes, metrics and iteration. Functional prototypes are central working artifacts and delivery is shared with engineers.

> Working prototypes in code, not click-throughs

**Boundary to review:** Boundary case: personal work is primarily working prototypes; engineering pairs at ship time.

### T05 — Level AI: Revenue Operations Architect — GTM Systems Builder

[Employer posting](https://jobs.ashbyhq.com/level-ai/ba2b8d96-a353-4cbe-a3ef-0cb749781dcd)

**Prediction:** yes. **Focus:** operations, revenue. **Experience gate:** explicit_non_swe_route.

**Qualifications:** 6+ years in RevOps, GTM engineering or sales strategy; Salesforce/Gong depth and personal systems-building experience.

**Reason:** Personally designs and ships production GTM agents and operating systems, defines their value and drives adoption.

> GTM AI agents you architect and ship

**Boundary to review:** The mandate is to create new systems, not merely use AI for sales reports.

### T06 — Kettle: Senior Creative Technologist

[Employer posting](https://job-boards.greenhouse.io/kettle/jobs/8885210002)

**Prediction:** yes. **Focus:** creative_operations, design. **Experience gate:** technical_fluency.

**Qualifications:** Hands-on creative technology/applied AI, shipped tools, strong frontend development, CMSs and AI APIs; no fixed SWE-career requirement stated.

**Reason:** Independently turns emerging AI capabilities into reusable tools, workflows and accelerators used by creative/product teams, and carries experiments into delivery.

> builds the tools, workflows, and accelerators that help Kettle do its best work

**Boundary to review:** AI coding assistants are less explicit; the implementation mandate uses AI APIs/tooling and reusable working outputs.

### T07 — PlanetScale: AI Developer Experience Engineer

[Employer posting](https://job-boards.greenhouse.io/planetscale/jobs/4463390009)

**Prediction:** yes. **Focus:** developer_experience, engineering. **Experience gate:** swe_required.

**Qualifications:** Software-engineering background, TypeScript/Go, real developer tooling, databases and daily AI coding-agent use; public communication also required.

**Reason:** Owns developer friction, personally builds integrations, plugins and evals, measures real use and ships improvements with AI-native tooling.

> Independence and speed: spotting a gap, shipping a fix, and telling people about it

**Boundary to review:** Substantial developer-relations work, but also concrete ownership of working integrations and measurement.

### T08 — Ramp: Design Engineer

[Employer posting](https://jobs.ashbyhq.com/ramp/b68aca53-16c0-4ced-ab1d-e8beb2940b4f)

**Prediction:** yes. **Focus:** design, engineering. **Experience gate:** technical_fluency.

**Qualifications:** Strong design and frontend-engineering experience, React/TypeScript/HTML/CSS and active Claude Code/Cursor use; NYC required.

**Reason:** Owns product surfaces from concept to production, builds directly with AI, validates with customers and improves shipped experiences.

> Own key surfaces end to end, from concept through production.

**Boundary to review:** Engineering depth is required, although the posting does not prescribe years in a SWE career.

### T09 — MongoDB: Staff Product Manager, AI Builder Experience

[Employer posting](https://www.mongodb.com/careers/job/?gh_jid=8129885)

**Prediction:** no. **Focus:** product. **Experience gate:** explicit_non_swe_route.

**Qualifications:** 8+ years in product management or equivalent, technical platform fluency and hands-on AI-tool use.

**Reason:** The primary deliverables are platform strategy, partner operating models, roadmaps and cross-functional outcomes. Personal software implementation is not established despite the builder wording.

> a clear product vision, strategy, and an executable roadmap

**Boundary to review:** Builder in the product area name is not evidence that the PM personally builds.

### T10 — OnePay: Platform Engineer, Builder Experience

[Employer posting](https://jobs.ashbyhq.com/oneapp/fbc0f334-5613-41fc-b5d7-87f2e5a20bee)

**Prediction:** no. **Focus:** engineering. **Experience gate:** swe_required.

**Qualifications:** 2–9 years of software engineering, distributed systems, AWS and developer platforms.

**Reason:** Describes conventional platform/core-service engineering with AI development tools. It does not establish the broader responsibility for finding user problems, shaping solutions and learning from adoption.

> 2-9 years of experience in software engineering

**Boundary to review:** Internal-platform builders can qualify; the missing problem-to-outcome mandate, not SWE experience, drives this No.

### T11 — HomeSmart Services: Forward Deployed Engineer — Applied AI

[Employer posting](https://homesmartservices.bamboohr.com/careers/1116)

**Prediction:** yes. **Focus:** operations, engineering. **Experience gate:** explicit_non_swe_route.

**Qualifications:** Strong Python, SQL/APIs and production judgment; no specific degree or years required, and independent projects count.

**Reason:** Identifies internal business problems, chooses approaches, personally builds AI-assisted production solutions and monitors adoption and results.

> You’ll identify meaningful business problems and build practical solutions

**Boundary to review:** Engineering skill is substantial; a prior professional engineering career is not mandated.

### T12 — Onos Health: Senior Product Engineer

[Employer posting](https://jobs.ashbyhq.com/onoshealth/58d36bae-5153-471a-9c8c-2094339be001)

**Prediction:** yes. **Focus:** engineering, product. **Experience gate:** swe_required.

**Qualifications:** 5+ years building software applications, strong product/system-design skills and hands-on technical leadership.

**Reason:** Works directly with health-plan users, defines and implements core product features, shapes the roadmap and uses AI coding tools for production delivery.

> Own end-to-end development of new features and functionality for the Onos platform

**Boundary to review:** A demanding engineering blend, not the priority non-SWE entry route.

## Review and scoring

Provide Yes, No or Maybe for T01–T12; keep Apollo separate. Save feedback against these exact source hashes, then score the frozen predictions before any further prompt revision. Uncertain human judgments remain uncertain. Do not add these roles to calibration before recording this evaluation outcome.

Source descriptions, source hashes, prompt hashes and the immutable prediction file are retained separately. The preparation script refuses to overwrite an already frozen batch. A duplicated Lever description subsection was removed before the prediction freeze; the initial normalization is preserved and the correction recorded. All twelve displayed evidence quotes were checked as exact substrings of the normalized source.
