# Deferred Work

> Captured during discovery and product specification. Review when planning future versions.

## Public Job Board

The public board is intentionally deferred. The current product should start as a CLI-first curation and analysis tool.

Future public board direction:

- Site name: AI Builder Jobs.
- Framework: Next.js.
- Styling: Tailwind CSS.
- Deployment target: Vercel or Netlify.
- Design reference: https://startups.gallery/jobs
- Public listings should link out to the original posting rather than hosting full job detail pages.

## Public Board Features

### Job Listing Display

Use a clean, minimal, table-style layout with:

- Role title linked to the original job posting.
- Company name.
- Location.
- Work type: Remote, Hybrid, or Onsite.
- Salary range when available.
- Posted date.
- Apply link to original posting.

### Filters

- Work type.
- Experience level.
- Industry or vertical.
- Keyword search.
- Possibly classification, if Builder-Adjacent roles are ever shown publicly.

### About Section

Keep the public copy job-board focused.

Draft positioning:

AI coding tools have created a new kind of role: not quite PM, not quite engineer. These roles combine product judgment, technical depth, and hands-on building. AI Builder Jobs collects roles where people are expected to turn product ideas and business problems into working software with AI-assisted tools.

Potential tagline:

The job board for people who build products with AI.

## Deferred Data Automation

Research the data pipeline before building automated sourcing.

Questions to answer:

- What job board APIs or feeds exist, and what are their terms?
- Which sources permit scraping, syndication, or API access?
- Can AI Builder roles be identified reliably from title and description, or do they require human curation?
- What is the right balance of automated sourcing and manual quality control?
- How should listings be checked for expiration or filled status?
- Should public data be a generated static export from the CLI's local dataset?

## Public Launch Criteria

Do not build the public board until the local curation flow has enough signal.

Potential criteria:

- At least 25 reviewed listings.
- Clear Core AI Builder vs Builder-Adjacent classification rules.
- Archive flow working.
- Export format stable enough for Next.js to consume.
- Basic trend data available from archived and active listings.

## From plans/greenfield/PRODUCT_SPEC.md (2026-05-12)

| Requirement | Reason | Notes |
|-------------|--------|-------|
| Public Next.js job board | Out of scope for MVP | Build only after the CLI has reliable sourcing, classification, labels, archive/status history, and exportable curated data. |
| Trend dashboards or reporting commands | Out of scope for MVP | Preserve archive/status/event data now so trend analysis can be built later. |
| Application tracking, reminders, resume/cover-letter drafting, or application notes | Out of scope for MVP | First version stops at finding, classifying, ranking, and saving opportunities. |
| Multi-user accounts, cloud sync, and admin UI | Out of scope for MVP | MVP is a local single-user CLI. |
| Full job posting snapshots | Out of scope for MVP | Show descriptions transiently during review, but store only metadata, links, labels, scores, signals, notes, and events by default. |

## From plans/greenfield/TECHNICAL_SPEC.md (2026-05-12)

| Requirement | Reason | Notes |
|-------------|--------|-------|
| Advanced job classifier beyond deterministic rules | Needs more research | Tracked in `features/job_classifier/INITIAL_NOTES.md`; compare prompt-only, embeddings, supervised classifier, active learning, and evaluation approaches after MVP labels exist. |
| SQLite or database-backed storage | Over-engineering for MVP | MVP uses inspectable JSON/JSONL files; revisit if query speed, migrations, or concurrency become painful. |
| Public web app integration | V2 feature | Keep export path, but do not build Next.js board in MVP. |
