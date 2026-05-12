# AI Builder Jobs - Initial Notes

## Current Direction

Build a CLI-first tool for curating and analyzing "AI Builder" job postings. The initial user is me: I want a practical local workflow for collecting promising postings, deciding whether they fit the category, preserving expired listings, and eventually publishing a filtered job board.

The public website is deferred. For now, optimize for high-quality personal curation and durable data.

## Working Definition

AI Builder roles sit at the intersection of product management, engineering, and applied AI. They are not quite traditional PM roles and not quite standard software engineering roles. They typically involve holding product context, working directly with stakeholders or users, and using AI tools to build, prototype, automate, or ship working software.

The core signal is not just the word "builder" in a title. A strong match should include several of these:

- Explicit AI/LLM/agent/tooling responsibilities.
- Hands-on building, prototyping, scripting, or software delivery.
- Product judgment, stakeholder discovery, customer understanding, or workflow mapping.
- Ownership from ambiguous problem to working solution.
- AI coding tools or adjacent tools such as Cursor, Claude Code, Codex, MCP, agents, workflow automation, LLM orchestration, RAG, or API integrations.
- Evidence that shipping working artifacts matters more than writing strategy documents.

## Classification Model

Use a private classification model before deciding what should ever be public.

### Core AI Builder

Listings that clearly combine AI/tooling, product or stakeholder ownership, and hands-on building. These are the best candidates for the main board.

Examples from seed data:

- Knotch: Product Builder
- Hello Heart: Senior AI Builder
- Tiger Data/Ghost: Builder in Residence
- Impiricus: AI Solutions Builder
- Owner.com: Product Builder

### Builder-Adjacent

Listings that strongly emphasize hands-on product building, technical fluency, and shipping, but do not clearly require AI-assisted building. Track these privately because they are useful for trend analysis, but do not treat them as default public listings yet.

Examples from seed data:

- ShopMy: Senior Product Builder-Brand

### Exclude

Listings that are ordinary PM, TPM, DevRel, AI PM, solutions engineering, or software engineering roles unless the description clearly matches the product-plus-building-plus-AI pattern.

## Current MVP

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

