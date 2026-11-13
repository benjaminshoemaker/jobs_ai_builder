# AI Builder Jobs - Initial Notes

## Current Direction

As of October 28, 2026, this is a fresh product exploration: help the user and people like them find United States jobs for an emerging category of AI-enabled builder. The primary value is a single place to discover relevant roles spread across inconsistent titles and sources. The user also wants to highlight and define this new category through writing and thought leadership, helping candidates and employers recognize the shift.

**Current product direction (October 28): build a focused job board.** The user wants the board even though existing sites can retrieve some of the same roles. Exclusive inventory is not a prerequisite: the board's value can be a coherent category, employer-checked listings, transparent qualification gates, and direct links to apply. Keep blog-post drafting in a separate thread. The first board should be small and curated, with freshness visible; the remaining open decisions are implementation and distribution details, not whether a board is worth attempting.

The central hypothesis is that AI enables people to combine product thinking with direct building and delivery, reducing the coordination and handoff overhead between deciding what to make and making it. The underlying builder archetype is older: a strong staff SWE owning an internal platform problem from discovery through adoption already fits it. AI expands who can work that way. Most people in the intended audience will not have substantial professional software engineering experience. Whether existing services already serve this audience well remains a research question.

The [category definition draft](CATEGORY_DEFINITION.md) gives the public-facing explanation and curation boundaries developed from the user's examples. The working definition below governs this exploration. The CLI, storage choices, and MVP plans later in this document preserve earlier work; they do not constrain the next implementation or authorize new development.

Latest boundary clarification: the user's OnePay and Medici approvals establish that owning an internal working practice and personally implementing AI-assisted operational workflows can qualify, without an explicit coding requirement or ownership of product strategy. Such implementation must be substantive, rather than a generic AI-efficiency aspiration. See the Luna v11 review clarifications in `CATEGORY_DEFINITION.md`; all prior exact-role labels remain in force.

The first [editorial draft](editorial/the-builder-loop.md) explains the builder archetype and what AI changes, using employer postings as concrete examples. It is a draft for review, not a published article or a product decision.

## Working Definition

### Builder focus and the primary search

The broader emerging role is a person who uses AI to personally build and deliver useful working solutions, taking responsibility for whether they work. **Focus** means the main decisions and outcomes the person is responsible for in the role, not their prior background, tools, or the artifact they happen to build. Classify that focus separately from category fit and required experience. These are observed examples, not an exhaustive list; record new areas when the work warrants it:

| Focus | Main decisions and outcomes |
| --- | --- |
| Product | What customers or employees need, what to build, and whether the resulting product succeeds. This is the primary discovery target and appears to be the most common focus in the roles reviewed so far. |
| Operations | Which business workflows or internal processes to improve, and whether the built systems produce useful operational outcomes. Product ownership is not required. Rillet is a user-confirmed example. |
| Engineering-led overlap | Technical capabilities chosen and built for real user problems, with responsibility for whether the solution works in use. It is distinct from the priority product-builder audience and requires more than ordinary implementation with AI tools. |
| Design | Design of product experiences combined with direct AI-assisted building and delivery, as in the user-confirmed Babylist example. |

These focuses can overlap and new ones may emerge. Keep **work focus**, **whether personal building is central**, and **required prior software-engineering experience** as separate judgments. A product-focused builder can require engineering experience; an operations-focused builder need not own a product; an engineering-led builder is not automatically a match for the primary search. The engineering-led boundary is inherently fuzzy: staff SWE roles with internal-platform problem ownership can fit the underlying archetype, while implementing assigned features with AI tools alone is insufficient. The current AI-enabled collection also requires AI to be a material building tool. The user-confirmed TRM, Sekai, and ITS Logistics roles show relevant engineering-led overlaps; earlier rejections of the specific brightwheel and Docker postings still stand.

### AI-enabled product builder

Someone who uses product judgment to decide what is worth building, uses AI to build it directly, and takes responsibility for delivering and improving a useful result. AI expands how much of the product-building loop that person can own, reducing the need to hand each step to a separate specialist.

The ideal role asks someone to ship code with AI without requiring a software engineering background. Product-minded software engineers can also qualify. Roles that genuinely blend product ownership and AI-assisted building but require engineering experience remain relevant as a distinct type; they should not be mixed into the ideal category or automatically excluded. Ordinary engineering, solutions delivery, and product coordination are not sufficient.

### Three requirements and a separate experience assessment

A qualifying **product-focused** role should provide evidence of all three:

1. **Product judgment:** understand customer or employee problems, choose or shape solutions, make tradeoffs, and learn from use or outcomes.
2. **Direct building:** personally create working prototypes, applications, agents, automations, internal tools, or product changes as a central responsibility. AI-assisted PM work or occasional prototypes that support a traditional PM mandate are insufficient. Coordinating other people's delivery alone is insufficient.
3. **AI as an enabler of building:** use AI to implement, test, iterate, or deliver those artifacts. An AI company, AI feature area, or incidental productivity-tool mention alone is insufficient. The resulting product does not itself have to contain AI.

Separately assess the required background, beginning with the qualifications. The user's review behavior is to go straight to this section. Record whether engineering experience is required, accepted as one of several routes, or unclear. Technical fluency and demonstrated useful builds do not by themselves establish an engineering career requirement.

Keep category fit separate from how demanding the qualifications are. The user considers Alt a fit that asks for a lot, rather than merely a stretch. Exiger is an accepted engineering-first product blend. SharkNinja has a builder mandate in the user's qualified assessment, with substantial finance/domain and experience requirements. High demands alone do not establish category mismatch.

Product judgment must be central to a product-focused match: owning or shaping what is worth building, not merely implementing customer-specific integrations or supporting accounts. Internal tools can qualify when the person treats employee problems as product problems and builds the solutions directly. An operations-focused builder may instead choose and build business-process improvements without owning a product; retain that as a distinct focus. An engineering-focused builder can also qualify when direct building is central and the work connects user needs back to product direction, as in the user-confirmed TRM role. Owning AI transformation through roadmaps and cross-functional squads without personal building does not qualify as a builder.

The opportunity is to shorten the loop from problem to working solution while retaining product judgment and responsibility for quality. This does not imply that engineering expertise is unnecessary, that every builder works alone, or that every role must independently own production infrastructure. Judge the overall mandate: working prototypes can qualify when building is central, but prototype language, AI-native working habits, or an isolated coding sentence cannot establish fit by themselves. Amperity remains a positive despite engineering owning production architecture; do not replace the user's distinction with a universal production-code requirement.

### Engineering experience boundary

Judge the required qualifications and actual responsibilities, not the title or seniority label:

- **Ideal:** product-building roles accepting product, operations, design, domain, or other relevant backgrounds alongside demonstrated AI-assisted building, without an engineering-career requirement.
- **Engineering-background blend:** roles combining substantive product judgment and direct AI-assisted building that require some engineering background. Retain as a distinct type, with the required depth explicit.
- **Stretch or unclear:** ambiguous requirements such as "strong engineering foundation" or "production experience," or responsibilities that imply an engineer despite permissive qualifications. Do not interpret silence as proof of accessibility or invent a fixed years-of-experience threshold.
- **Exclude:** work centered on conventional engineering, customer-specific solutions implementation without broader product feedback or ownership, or product coordination without central personal building. Engineering experience or a forward-deployed title alone does not determine this decision.
- Distinguish experience required to enter the job from work performed in the job. Writing code, debugging, testing, using APIs, or shipping production changes does not automatically make a role ineligible. Conversely, mentioning AI does not remove a traditional engineering experience requirement.
- Seniority in product or another discipline is compatible with this audience. "Accessible without an engineering career" does not mean entry-level or technically undemanding.

Illustrative boundary: a PM role requiring product experience and a portfolio of AI-built tools may be ideal. A genuine product-building blend requiring prior engineering belongs in a separate group. A conventional engineering role with AI tools or a solutions role does not become a product-builder role merely because it includes discovery or end-to-end delivery. TRM's forward-deployed role is a positive engineering-focused builder because it directly builds for mission users and feeds their needs into the product roadmap; the earlier Cyvl and Form Energy negatives remain specific judgments.

### Role types to distinguish

Keep these work types visible, allowing overlap and further focuses. The three requirements above define the primary product-focused matches; direct AI-assisted building and ownership of useful outcomes also identify builders in operations, engineering, design, or other areas. Assess engineering-background expectations separately:

| Type | Center of the work |
| --- | --- |
| Product-led builder | Product discovery and decisions, combined with directly building and testing solutions. |
| Product engineer | Hands-on product implementation with substantive product judgment; distinguish whether engineering experience is required. |
| Internal tools builder | Understand employee workflows and directly build useful AI-enabled tools or automations. |
| Operations-focused builder | Personally builds systems and workflows to improve business operations; may not own a product. |
| Engineering-focused builder | Personally builds software with AI, with technical implementation as the main mandate; assess product ownership and experience requirements separately. |
| Design-focused builder | Designs experiences and personally builds or ships working artifacts with AI; assess coding expectations separately. |

For every candidate, distinguish required background, depth of coding expected, prototype versus production responsibility, and access to engineering support. These help explain fit without treating all building roles as interchangeable.

### User-reviewed examples

The following are user judgments of the reviewed versions, not fresh claims about availability or unchanged qualifications.

**Strong reference examples:** Axiad Principal Product Builder; Vailent/Vinmar Builder (Product Led); Alaffia AI Transformation Lead; Medecision AI Product Builder (user: "perfect"). Indeed Flex Product Builder is good and Amperity Principal Product Builder is a great fit. GitLab AI Transformation Owner, Product & Design is a related positive with a different balance of work.

**October 21 calibration:**

| Role | User judgment and reason |
| --- | --- |
| [Rivian: AI Product Engineer, Facilities](https://careers.rivian.com/careers-home/jobs/34304?lang=en-US) | Good match. |
| [G2: Senior AI Product Builder](https://jobs.ashbyhq.com/g2/92dc2275-115f-4676-a607-fdda964e8121) | Good match; engineering-foundation language is not an automatic exclusion. |
| [Apollo: Principal Product Builder, Data](https://job-boards.greenhouse.io/apolloio/jobs/6229000004) | Good match. |
| [RWE: Senior Product Manager, AI Transformation](https://jobs.rwe.com/RWE/job/Austin-Sr-Product-Manager%2C-AI-Transformation-TX-78701/1415821833/) | Not a match: product ownership of AI transformation, without direct building. |
| [Cyvl: Forward Deployed Engineer](https://jobs.ashbyhq.com/cyvl/0e848342-babd-4ff7-834e-ca4b7c710f75) | Not a match: solutions work rather than product. |
| [Extenteam: Founding AI Product Engineer, Multifamily](https://job-boards.greenhouse.io/extenteamcareers/jobs/5254865008) | Interesting stretch: appears to want an engineer despite not explicitly requiring that background. |
| [Within: Senior AI Product Manager](https://jobs.ashbyhq.com/within.ai/6886702a-4e88-4cc1-9f71-04b690aefb9a) | Good match. |
| [EarnIn: Senior Product Builder](https://job-boards.greenhouse.io/earnin/jobs/8261686) | Good match. |
| [Form Energy: Staff Forward Deployed Engineer](https://jobs.ashbyhq.com/formenergy/b271995b-a17b-4153-abf2-f1ab4c2283f2) | Not a match: forward-deployed/solutions work. |
| [Toast: GTM Engineer](https://careers.toasttab.com/jobs/gtm-engineer-sales-workflow-automation-revenue-intelligence-remote-united-states) | Not a match: engineering-centered role. |

Five positives, one stretch, and four negatives in this selected calibration set do not measure discovery precision or market prevalence.

**Follow-up review of the discovery pilot:**

| Role | User judgment and reason |
| --- | --- |
| [Indeed Flex: Product Builder](https://job-boards.eu.greenhouse.io/indeedflex/jobs/4994921101) | Good match. |
| [Legion Health: Founding Product Manager](https://jobs.ashbyhq.com/legionhealth/0ffded39-1242-4a35-9bc3-0e5b0ce22276) | Not a match: user considers the overall job traditional PM work. The reviewed version explicitly mentioned regular production PRs, so preserve this evidence discrepancy rather than claiming it contained no coding requirement. An isolated coding sentence is not a sufficient inclusion rule. |
| [Medecision: AI Product Builder](https://recruiting.paylocity.com/Recruiting/Jobs/Details/4571394) | Perfect match. |
| [CloudZero: Senior/Staff Product Manager, Agentic Practice](https://jobs.ashbyhq.com/CloudZero/9a295df8-1e90-43df-b903-b01eabc3e240) | Not a match: AI-native PM rather than builder. Personal AI prototyping alone does not clear the category boundary. |
| [Amperity: Principal Product Builder](https://amperity.com/careers/8212260?gh_jid=8212260) | Great fit. |

These user labels supersede the assistant's initial pilot assessments. The pilot's original 17 strong matches were provisional judgments, not validated positives; the remaining recommendations still need assessment under this sharper distinction.

### Local prototype status (October 21, 2026)

The `jobs prototype` commands now provide a separate qualifications-first experiment, documented in README. They retain all 44 current reference judgments (the original 27, five later scan judgments, and twelve source-hidden boundary judgments), scan public employer boards without title gating, support broad Jooble snippet retrieval, and optionally assess transient descriptions through a reference-calibrated model. Fit, open-ended work focus, engineering requirements, location uncertainty and availability are separate fields; explicit corrections take precedence. The legacy scorer remains unchanged.

A live collection check retrieved 110 postings from Vanta, Oath and Alt and rediscovered the three known positives. This validates collection, not unseen-role relevance or an advantage over substitutes. Credentials were unavailable for live AI and broad supplier testing; those paths remain unvalidated against live services. Extraction-only cards remain unclear. The next evidence needed is an unseen-role evaluation and a fair comparison with existing searches, using the 27 examples only for calibration.

The [October 27 unseen-role scan](research/unseen-role-scan-2026-10-27.md) surfaced five U.S. roles. The user confirmed Overjoy, Figma, MangoApps and Veho as strong product-focused matches, and Rillet as an interesting operations-focused builder whose mandate is business rather than product. Figma and Veho are already surfaced by HiringCafe, so this scan does not establish a discovery advantage. A four-board prototype run initially ranked irrelevant Figma sales roles ahead of Figma's builder posting; a retrieval-ranking repair moved Figma and Veho to the first two positions, while adjacent PM roles remained. The sample was selected after manual search and was not blinded. The next evidence needed is a fairer head-to-head evaluation using these judgments.

The [source-hidden comparison started October 27](research/source-hidden-study-2026-10-27.md) has 58 candidate records from two existing searches and selected employer boards, excluding the then-current 32 calibration examples where identifiable. Its first 12 employer-checked postings now have [user fit and focus judgments](research/source-hidden-review-batch-1-labels-2026-10-27.json): ten yes, one maybe, one no. This boundary batch is purposeful, so no source-yield result can be inferred from these labels. The current site slices and manually seeded boards cannot establish a market-wide discovery advantage.

The [closest-substitute and freshness audit](research/substitute-audit-2026-10-27.md) found four of fifteen recent user-confirmed postings in AI Native Builder's current 210-record product-builder category page, while HiringCafe's public searches already show many strong matches. OpenSesame's employer posting is part-time onsite, yet AI Native Builder displays a full-time chip for it. This supports testing employer-checked, qualifications-first triage as a possible advantage; it does not prove more complete discovery or saved review time. Further broad user labeling is paused. A short, equal-task comparison against the two existing services is the next useful test before any build decision.

The [October 27 head-to-head search comparison](research/head-to-head-2026-10-27.md) found strong current U.S. roles through HiringCafe and public search, including Kickoff, Bond Sports, AI Fund, and Klarify. AI Native Builder's inspected U.S. slice included the current UKON role, a real product/code blend whose production-code requirements narrow the audience fit. Employer checks also exposed material title or seniority differences (Kickoff and 4M) and an older Extenteam listing absent from its current employer board. The HiringCafe pass exceeded its time cap, so this is not a valid speed or yield comparison. HiringCafe finding several roles only demonstrates that some listings are searchable; it does not test whether an editorial home for the category, a coherent cross-title collection, and qualifications-first analysis would be valuable. A unique inventory advantage is unproven, but it is not a prerequisite for the user's combined discovery and thought-leadership thesis. The next exploration should test an editorial/curation concept with a clear category definition, employer-checked examples, and writing that explains the role; evaluate whether it helps the intended audience recognize opportunities and whether it prompts useful discussion, alongside ordinary discovery quality. Preserve research mode until a product direction is selected.

### Calibration practice and latest pilot reassessment

Use the entire user-reviewed reference set, not only the latest or clearest three positives. The historical [pilot audit](research/discovery-pilot-2026-10-21.json) records the earlier 27 references explicitly in `user_reference_set`, including examples outside its 50 candidates: 17 positives (including GitLab as related and SharkNinja as qualified), eight negatives, Extenteam as a stretch, and Exiger as an engineering-first blend. The prototype then added four product-focused positives and Rillet's operations-builder judgment for 32 total; twelve later source-hidden judgments bring the current set to 44. Keep specific user judgments intact. Where positive and negative examples leave the boundary uncertain, hold a candidate rather than invent a universal rule from a title, a prototype mention, or a coding sentence.

Using this complete set, the assistant rechecked and reassessed the 23 current pilot postings without a user label: four recommendations (ShipBob, Vanta, Oath, and the finance-specific SharkNinja role), one engineering-first product blend (Exiger), one technical stretch (Alt), three held cases (Level AI, Tread, Clutch), and 14 exclusions. This includes removing Kettle and Applied Intuition as insufficiently central building mandates and Artera as solutions-led. These are assistant judgments, not additional user-approved examples. Eleven in-pilot user labels are preserved; 16 other rows remain withheld for availability. The audit's `reassessment` fields supersede its historical initial classifications for recommendations.

Subsequent user feedback supersedes those six assistant dispositions: ShipBob, Vanta, and Oath are good matches; Alt is a fit with high demands; Exiger's engineering-first product-blend assessment is accepted; SharkNinja requires a lot but does seem to have a builder role. These judgments are recorded in the audit, with the earlier reassessment preserved as history. The original counts in the preceding paragraph describe that earlier pass, not the latest user-label totals.

The user explicitly rejected these postings because they required significant software engineering experience:

- [brightwheel: Staff AI Software Engineer, Product](https://jobs.ashbyhq.com/brightwheel/1e5afc7d-5a4d-437e-bade-1e4a14ba4c24).
- [Docker: Staff Software Engineer, AI Developer Tools](https://jobs.ashbyhq.com/docker/87bda848-01ed-4641-beaa-829373d0ed56).

Keep those specific negative labels. The October 21 clarification supersedes a blanket exclusion of all roles requiring engineering experience; it does not automatically relabel those two postings. Other previously surfaced listings and historical seed examples still need assessment; being mentioned earlier is not an accepted positive label.

### Discovery signals

Titles and tools are useful retrieval clues, not sufficient inclusion criteria. Useful signals include:

- Explicit AI/LLM/agent/tooling responsibilities.
- Hands-on building, prototyping, scripting, or software delivery.
- Product judgment, stakeholder discovery, customer understanding, or workflow mapping.
- Ownership from ambiguous problem to working solution.
- AI coding tools or adjacent tools such as Cursor, Claude Code, Codex, MCP, agents, workflow automation, LLM orchestration, RAG, or API integrations.
- Evidence that shipping working artifacts matters more than writing strategy documents.

## Classification Model

Use a private classification model before deciding what should ever be public.

### Core AI Builder

Listings that satisfy the three requirements and offer an accessible route without a substantial professional software engineering career: the priority audience.

Historical seed examples to reassess against the clarified definition:

- Knotch: Product Builder
- Hello Heart: Senior AI Builder
- Tiger Data/Ghost: Builder in Residence
- Impiricus: AI Solutions Builder
- Owner.com: Product Builder

### Engineering-Background Product Builder

Listings that satisfy the three requirements but require engineering experience. Keep the blend visible as a distinct type, rather than treating the experience requirement as an automatic exclusion. Record the specific evidence and depth required.

### Builder-Adjacent

Listings with relevant building signals whose fit remains unresolved, or which lack clear AI-assisted building. Keep uncertainty explicit: missing evidence is different from a confirmed mismatch. Include stretch cases where the actual work appears to demand an engineer despite broader listed qualifications. Adjacent listings are not default inclusions in the core feed.

Historical seed example to reassess:

- ShopMy: Senior Product Builder-Brand

### Exclude

Listings that fail the three requirements or center on conventional engineering, solutions implementation, or delivery coordination rather than product building. Neither titles nor engineering-background requirements alone decide inclusion.

## Historical MVP Plan

Create a local CLI tool that supports manual curation first.

Potential commands:

- `jobs add <url>`: add a candidate posting URL.
- `jobs review`: step through candidate postings and classify them.
- `jobs list`: view active curated postings.
- `jobs archive <id>`: mark an expired, filled, or otherwise inactive listing while keeping it in the dataset.
- `jobs search <query>`: search local listings by title, company, keywords, classification, or status.
- `jobs export`: produce a JSON snapshot suitable for a future Next.js read-only board.

Do not build an admin UI yet. The CLI is the curation surface.

## Data Strategy

Start with repo files rather than a database.

Recommended structure:

- `data/jobs/*.json`: one structured record per job.
- `data/events.jsonl`: append-only lifecycle events such as discovered, reviewed, included, archived, expired, salary-updated, or classification-changed.
- `data/sources.json`: known source types and parser notes.

This keeps the system inspectable, git-friendly, and easy to analyze later. It also leaves room to use patterns or code from `~/Projects/fast_pr_analytics` without committing to a web app or database too early.

Suggested fields for a job record:

- `id`
- `title`
- `company`
- `url`
- `source`
- `location`
- `workType`
- `salary`
- `postedDate`
- `discoveredDate`
- `status`
- `classification`
- `confidence`
- `industry`
- `experienceLevel`
- `signals`
- `notes`
- `lastCheckedAt`
- `archivedAt`
- `archiveReason`

## Archive Requirement

The archive is a core feature, not an afterthought. Filled or expired jobs should remain in the local dataset so trends can be shown later.

Useful trend questions:

- Which titles are emerging?
- Which companies are hiring for these roles?
- Which industries are adopting AI Builder roles first?
- How often do these postings mention specific tools such as Cursor, Claude Code, Codex, MCP, agents, or RAG?
- How are salary bands changing?
- Are roles becoming more product-led, engineering-led, or operations-led over time?

## Initial Seed Listings

- Knotch: Product Builder ($160-180K) - https://www.linkedin.com/jobs/view/4412317108/
- Hello Heart: Senior AI Builder - https://www.linkedin.com/jobs/view/4403537044/
- Tiger Data/Ghost: Builder in Residence - https://jobs.ashbyhq.com/TigerData/dbfd8ad3-fe92-4e1e-a133-263544ec42f2
- Owner.com: Product Builder - https://jobs.ashbyhq.com/owner/1912d8d8-b37f-4330-91ea-bb428d091322
- ShopMy: Senior Product Builder-Brand - https://job-boards.greenhouse.io/shopmy/jobs/5153099008
- Impiricus: AI Solutions Builder ($165-210K) - https://job-boards.greenhouse.io/impiricus/jobs/5214167008

## Open Questions

- Should Builder-Adjacent roles ever appear publicly, or only in private analysis?
- Should the CLI fetch and snapshot posting text, or only store user-entered summaries and links?
- Which sources are acceptable to scrape or call programmatically?
- What is the right review cadence for checking whether postings are still active?
- Should classification be deterministic rules first, LLM-assisted, or both?
