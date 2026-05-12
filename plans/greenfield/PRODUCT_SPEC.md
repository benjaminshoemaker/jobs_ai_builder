# Product Spec: AI Builder Jobs CLI

Generated: 2026-05-12
Source: `/product-spec` conversation plus `plans/greenfield/DISCOVERY_NOTES.md`

## Product Summary

AI Builder Jobs CLI is a local, single-user command-line tool for finding personally relevant AI Builder job opportunities. It sources broad candidate jobs from job APIs, ATS feeds, and manually added URLs, ranks them for "AI Builder" fit, shows the highest-signal candidates for interactive review, and learns from user feedback.

The public job board is out of scope for this product spec. The immediate goal is to find roles the user would not otherwise discover through LinkedIn and startups.gallery, while building a labeled dataset and auditable scoring logic that can support a public board later.

## Problem

AI Builder roles are scattered, inconsistently titled, and hard to separate from generic AI PM, product engineering, ML engineering, DevRel, automation, prompt/content, or normal software engineering roles. Existing job search surfaces do not reliably capture the emerging category where a person owns product discovery, builds real software, and uses AI agents or AI coding workflows as a core production interface.

## Primary User

The MVP is for one local user: the project owner searching for personally interesting AI Builder opportunities.

The product optimizes for:

- Finding relevant roles in one place.
- Surfacing roles the user was not already finding through LinkedIn or startups.gallery.
- Reducing review time by ranking a broad candidate pool and showing only the top candidates by default.
- Capturing labels and feedback so the feed improves over time.

## Research Context

Current source research supports a pragmatic MVP combining broad jobs APIs with selected ATS adapters and manual URL ingestion.

- Greenhouse exposes a public Job Board API for published jobs, with unauthenticated GET endpoints for job-board data: [Greenhouse Job Board API](https://developer.greenhouse.io/job-board.html).
- Ashby exposes a public Job Postings API with fields including title, location, workplace type, description, URL, and optional compensation: [Ashby Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api).
- Lever documents a Postings REST API for job-site use: [Lever Postings API](https://github.com/lever/postings-api).
- Adzuna offers a keyword/location job-search API with API-key access: [Adzuna API](https://developer.adzuna.com/).
- Jooble offers a REST jobs API: [Jooble API documentation](https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation).
- Karpathy's `autoresearch` is relevant as inspiration for bounded experiment loops, but not a direct product dependency: [karpathy/autoresearch](https://github.com/karpathy/autoresearch).

Discovery also identified JobMatch Bot, JobSpy, Ever Jobs, JobDataPool, Argilla, ASReview LAB, and OpenJobs as possible references or leverage points. None replace the full product.

## Core Concept

The CLI runs an on-demand feedback loop:

1. Fetch up to 50 candidate jobs by default across configured sources when at least 50 source results are available.
2. Normalize, deduplicate, and rank candidates.
3. Show the top 10 candidates for interactive review by default.
4. Display the job metadata, score explanation, signals, URL, and transient description during review so the user can judge the role.
5. Capture a lightweight label: `yes`, `maybe`, or `no`.
6. Capture structured reasons when the user chooses to add them.
7. Save promising opportunities and learning data.
8. Adjust review-time behavior when feedback matches a configured immediate-adjustment rule, while recording an audit trail.
9. Queue larger scoring/source/classifier changes for aggregate review when needed.

## CLI Commands And UX

The MVP command surface must be explicit enough for implementation and later testing.

- `jobs discover`: Fetch candidates, rank them, and start interactive review.
- `jobs add <url>`: Add a manually found posting.
- `jobs list`: Show saved active opportunities by default.
- `jobs list --status maybe|candidate|rejected|archived`: Show non-default status views.
- `jobs review maybe`: Review jobs currently in the maybe queue.
- `jobs show <id>`: Show saved metadata, score, signals, events, and source listings for one job.
- `jobs archive <id>`: Archive a job with a reason.
- `jobs search <query>`: Search locally stored jobs by title, company, notes, signals, source, and status.
- `jobs proposals`: Review queued changes to sources, scoring, prompts, or classifier behavior.
- `jobs sources list`: Show configured and discovered sources.
- `jobs sources add <url>`: Add a reusable company or ATS source.
- `jobs sources test <id>`: Test whether a configured source can fetch current postings.
- `jobs config`: View or edit local preferences and source settings.
- `jobs export`: Export curated metadata for future public-board use.

Common command flags must include `--limit`, `--since`, `--status`, `--include-archived`, `--include-rejected`, `--sort`, and `--interactive=false`.

## Personal Relevance Model

AI Builder fit remains the primary ranking signal for MVP. Other personal preferences may influence ranking or filtering, but they must not obscure the core category fit.

The CLI must support local preferences for:

- Work type: remote, hybrid, onsite, or no preference.
- Location constraints.
- Seniority or experience level.
- Compensation floor.
- Company stage or company type.
- User-defined exclusions.

Each preference must be marked as one of:

- `hard_filter`: candidate is not shown unless manually added.
- `soft_rank`: candidate may still be shown but receives a score adjustment.
- `note_only`: candidate is not filtered or reranked, but the preference appears in the review explanation.

## Classification Definition

### True AI Builder Role

A role is a strong AI Builder candidate when it combines:

- Product discovery or ambiguous problem ownership.
- Building real functionality, internal or customer-facing.
- Agent implementation, LLM workflows, or AI-native build mechanics.
- Production ownership, not only prototypes or mocks.

### Product Engineer Boundary

Product Engineer roles are included only when AI agents or AI coding tools are structural to how the role builds and ships software. Generic product engineering at an AI company is not enough.

Include signals:

- Explicit references to tools such as Claude Code, Cursor, Codex, Replit, Lovable, MCP, agents, or multi-agent workflows.
- Language such as "direct AI coding agents," "orchestrate agents," "AI generates the majority of our code," "build with AI coding agents," or "not writing every line by hand."
- Ownership from problem discovery to shipped software.
- Product taste, systems thinking, rapid shipping, and maintainability expectations.

Weak signals:

- "We use Cursor."
- "AI company hiring product engineer."
- "Move fast with AI."
- "Vibe coding" without production ownership or engineering discipline.

### Exclusions

The MVP treats these as outside the core category unless the posting clearly crosses the AI Builder boundary:

- Pure AI product manager roles.
- Pure ML engineer roles.
- Prompt-engineering or content roles.
- Generic automation roles.
- DevRel roles.
- Normal full-stack engineering roles at AI companies.

## User Flows

### Flow 1: Discover And Review Jobs

1. User runs `jobs discover`.
2. CLI fetches a broad candidate pool from configured sources.
3. CLI fetches up to 50 candidates by default, using per-source quotas or round-robin selection so one source cannot dominate the review pool.
4. If fewer than 50 candidates are available, CLI ranks and reviews the available candidates without failing.
5. CLI normalizes, deduplicates, and ranks candidates.
6. CLI presents the top 10 candidates for review.
7. For each candidate, CLI shows a rich review card:
   - Title.
   - Company.
   - Source.
   - Original URL.
   - Location and work type when available.
   - Salary or compensation when available.
   - Posted date when available.
   - Current status.
   - AI Builder score.
   - Top positive and negative signals.
   - One-line "why surfaced" explanation.
   - Job description fetched transiently for review.
8. User labels the candidate `yes`, `maybe`, or `no`.
9. CLI saves the label, metadata, reason signals, and any optional notes.
10. CLI updates the current session's ranking behavior if the feedback matches a configured immediate-adjustment rule.
11. CLI records all review-time scoring or query changes in an audit log.

### Flow 2: Add A Manually Found Job

1. User runs `jobs add <url>`.
2. CLI detects the source type when possible.
3. For LinkedIn URLs, CLI does not fetch the page by default. It stores the URL and prompts the user for minimal metadata if needed.
4. For sources with documented public APIs or permitted public job-board endpoints, CLI fetches available metadata and, if permitted, a transient description for review.
5. CLI asks whether this source should be searched again later.
6. For ATS/company-job-board URLs, the default answer is yes.
7. For one-off LinkedIn URLs, the default answer is no.
8. CLI saves the job and any source-discovery signal.

### Flow 3: Review Maybe Queue

1. User runs a command to review maybe items.
2. CLI shows jobs labeled `maybe`.
3. User can relabel each item as `yes`, `no`, or leave it as `maybe`.
4. CLI preserves the label history for learning.

### Flow 4: List Saved Opportunities

1. User runs a list command.
2. CLI shows jobs labeled `yes` by default.
3. User can include `maybe`, `rejected`, `candidate`, or `archived` lifecycle statuses with filters.
4. Rejected jobs are hidden from normal list views but remain searchable and available as negative examples.

### Flow 5: Archive A Job

1. User archives a job that is expired, filled, irrelevant, or no longer useful.
2. CLI preserves the job metadata, link, status history, and archive reason.
3. Archived jobs remain available for future trend analysis.

### Flow 6: Review Proposed Logic Changes

1. CLI accumulates larger suggested changes that are not applied immediately.
2. User runs a command to review proposed changes.
3. CLI explains the evidence behind each proposal.
4. User approves, rejects, or defers each proposal.

### Flow 7: Interrupted Review Session

1. User exits during interactive review.
2. CLI preserves reviewed labels and events already recorded.
3. Unreviewed candidates remain in `candidate` state or are discarded based on the command mode.
4. User can resume from saved candidates with a review command.

### Flow 8: No New Candidates

1. User runs `jobs discover`.
2. CLI fetches from configured sources.
3. If no new candidates are found after deduplication and cooldown checks, CLI reports that no new review items are available.
4. CLI does not resurface recently rejected, archived, or already reviewed jobs unless the user opts in with an explicit flag.

### Flow 9: Refresh Existing Jobs

1. User runs a refresh command.
2. CLI checks saved source URLs where allowed by source behavior.
3. CLI updates last-seen metadata, records source errors, and marks jobs as potentially expired when source evidence indicates the listing is gone.
4. CLI does not delete jobs when they disappear from a source.

## Label, Status, And Identity Semantics

The product must separate review feedback from lifecycle state.

- A `review_label` is a user judgment event: `yes`, `maybe`, or `no`.
- A `lifecycle_status` is the current state used for listing and filtering: `candidate`, `active`, `maybe`, `rejected`, or `archived`.
- A `yes` label moves the job to `active`.
- A `maybe` label moves the job to `maybe`.
- A `no` label moves the job to `rejected`.
- Archiving changes `lifecycle_status` to `archived` without deleting the review history.

The product must distinguish canonical jobs from source listings:

- A canonical job represents the deduplicated opportunity.
- A source listing represents one source-specific appearance of that job, including source URL, source ID when available, last seen date, and source error state.
- One canonical job can have multiple source listings.
- The user must have a way to mark two records as "do not merge" when automatic deduplication creates a false merge.

## MVP Requirements

- **REQ-001:** The product must provide a local CLI for a single user.
- **REQ-002:** The CLI must support an on-demand `jobs discover` flow that fetches, ranks, and starts review in one command.
- **REQ-003:** `jobs discover` must retrieve up to 50 candidates by default when source results are available, use per-source quotas or round-robin selection, rank them, and present the top 10 candidates for review.
- **REQ-004:** The CLI must support manual URL ingestion with `jobs add <url>`.
- **REQ-005:** Manual URL ingestion must treat a manually found job as both a job candidate and a potential source-discovery signal.
- **REQ-006:** The CLI must support source types for at least one broad jobs API and selected ATS/company-job-board adapters.
- **REQ-007:** MVP source priority must be manual URL ingestion, one broad jobs API, and ATS adapters for Ashby, Greenhouse, and Lever.
- **REQ-008:** The CLI must avoid depending on LinkedIn scraping for MVP functionality.
- **REQ-009:** For LinkedIn URLs, the CLI must default to no-fetch ingestion and prompt for minimal user-entered metadata when metadata is unavailable.
- **REQ-010:** The CLI must normalize candidate jobs into a shared metadata shape.
- **REQ-011:** The CLI must deduplicate candidates across sources when URLs, company/title combinations, or source identifiers indicate the same role.
- **REQ-012:** The CLI must rank candidates by AI Builder fit before showing them for review.
- **REQ-013:** The review view must show a rich job card with metadata, source, score, signals, explanation, link, and description.
- **REQ-014:** Job descriptions can be fetched and displayed transiently during review.
- **REQ-015:** The CLI must not persist full job descriptions by default.
- **REQ-016:** The CLI must persist metadata, links, labels, scores, reason signals, and notes needed for review and learning.
- **REQ-017:** The CLI must support labels `yes`, `maybe`, and `no`.
- **REQ-018:** Jobs labeled `yes` must be saved as active opportunities.
- **REQ-019:** Jobs labeled `maybe` must be saved separately from the active opportunity list.
- **REQ-020:** Jobs labeled `no` must be retained as negative learning examples.
- **REQ-021:** Jobs with `rejected` lifecycle status must be hidden from normal list views by default but searchable through explicit filters.
- **REQ-022:** The CLI must support the review labels and lifecycle statuses defined in this spec.
- **REQ-023:** The CLI must separate `review_label` values from `lifecycle_status` values.
- **REQ-024:** The CLI must support lifecycle statuses `candidate`, `active`, `maybe`, `rejected`, and `archived`.
- **REQ-025:** The CLI must preserve status and label history.
- **REQ-026:** The CLI must support archiving inactive, expired, filled, or historically useful jobs.
- **REQ-027:** Archived jobs must remain available for future trend analysis.
- **REQ-028:** The CLI must show why each candidate was surfaced during review.
- **REQ-029:** The CLI must support optional structured reasons or notes when the user wants to provide richer feedback.
- **REQ-030:** The CLI must be able to update review-time ranking or scoring behavior during a session when feedback matches a configured immediate-adjustment rule.
- **REQ-031:** Review-time learning changes must be recorded in an audit log.
- **REQ-032:** The CLI must support a proposal queue for larger source, query, scoring, prompt, or classifier changes that should be reviewed in aggregate.
- **REQ-033:** Proposed logic changes must be human-approved before becoming durable defaults.
- **REQ-034:** Review-time ranking changes must be reversible within the current session.
- **REQ-035:** The CLI must continue running when a source fails, rate-limits, or returns incomplete data.
- **REQ-036:** The CLI must preserve partial metadata and source error details when a candidate or source cannot be fully processed.
- **REQ-037:** The CLI must use local storage only for MVP.
- **REQ-038:** The MVP must not require user accounts, cloud sync, or access control.
- **REQ-039:** The MVP must preserve job metadata, source metadata, labels, scores, signals, status history, and archive events so future trend/reporting features can be built without changing the core event model.
- **REQ-040:** The CLI must support no-new-candidate sessions without treating them as errors.
- **REQ-041:** The CLI must avoid resurfacing recently reviewed, rejected, or archived jobs unless the user explicitly includes them.
- **REQ-042:** The CLI must preserve completed review events if the user interrupts an interactive review session.

## Data Requirements

- **REQ-043:** Each canonical job record must have a stable local ID.
- **REQ-044:** Each canonical job record must store title, company, discovered date, lifecycle status, and current review label when available.
- **REQ-045:** Each job record must store location, work type, salary/compensation, posted date, industry, experience level, and source-specific identifiers when those fields are available from source metadata or user input.
- **REQ-046:** Each job record must store AI Builder score and surfaced reason data.
- **REQ-047:** Each job record must store the positive and negative signals used for ranking and review.
- **REQ-048:** The system must store source records for configured APIs, ATS boards, and user-discovered sources.
- **REQ-049:** The system must store source-listing records with source URL, source ID when available, source type, first seen date, last seen date, and source error state.
- **REQ-050:** Source records must distinguish reusable sources from one-off manually pasted URLs.
- **REQ-051:** The system must store event history for discovery, review, label changes, scoring changes, source errors, proposal decisions, and archive events.
- **REQ-052:** Full job description text must not be stored by default.
- **REQ-053:** The system must store deduplication decisions and user-entered do-not-merge decisions.

## Non-Functional Requirements

- **REQ-054:** The CLI must be usable in on-demand sessions without requiring a background daemon.
- **REQ-055:** A normal review session must default to 10 reviewed candidates.
- **REQ-056:** The CLI must provide separate list/filter views for active opportunities, maybe items, rejected examples, and archived jobs.
- **REQ-057:** The CLI must show the score, positive signals, negative signals, and learning-change audit entries needed to explain why results changed.
- **REQ-058:** The CLI must avoid source behavior that requires authenticated LinkedIn scraping or source access patterns that are explicitly disallowed by documented source terms.
- **REQ-059:** The CLI must store local data in files that can be inspected with standard text or JSON tooling.
- **REQ-060:** The product must preserve an export path for a future public board, while keeping the public board itself out of scope.
- **REQ-061:** The CLI must support local preference settings for work type, location, seniority, compensation floor, company type, and user-defined exclusions.
- **REQ-062:** Each preference must be represented as `hard_filter`, `soft_rank`, or `note_only`.
- **REQ-063:** The CLI must support a refresh flow that records whether saved job source listings are still visible, unavailable, or errored without deleting the local job.
- **REQ-064:** The CLI must support an evaluation loop that tracks at least precision@10 and yes/maybe acceptance rate across review sessions.

## Out Of Scope For MVP

- Public Next.js job board.
- Trend dashboards or reporting commands.
- Application tracking.
- Resume, cover letter, or application-note generation.
- Reminders or follow-up tracking.
- Multi-user accounts.
- Cloud sync.
- Admin UI.
- Storing full job posting snapshots by default.
- LinkedIn scraping as a required source.

## Deferred Requirements

Deferred requirements are tracked in root `DEFERRED.md`.

Important deferred areas:

- Public Next.js job board once the CLI logic is reliable.
- Trend analysis and reporting over archived/saved jobs.
- Deeper research into active learning, human feedback loops, lightweight classifiers, evaluation sets, and Karpathy-style autoresearch-inspired experiment loops.
- Application workflow support.
- Optional richer dataset review tooling if the CLI becomes too limiting.

## Success Criteria

The MVP is successful when:

- The user can run an on-demand discovery session that fetches up to 50 available candidates and reviews 10 ranked candidates.
- The reviewed candidates come from a broader source pool than LinkedIn and startups.gallery alone.
- After at least three successful discovery sessions, the saved opportunities include at least one role the user did not already find through LinkedIn or startups.gallery.
- The CLI explains why candidates were surfaced.
- Feedback from review changes either the current session behavior or creates auditable proposed improvements.
- Saved metadata, labels, and event history are sufficient to improve the feed over time.

## Requirements Index

| ID | Requirement | Section |
|----|-------------|---------|
| REQ-001 | Provide a local single-user CLI | MVP Requirements |
| REQ-002 | Support `jobs discover` | MVP Requirements |
| REQ-003 | Retrieve up to 50 candidates and show top 10 | MVP Requirements |
| REQ-004 | Support `jobs add <url>` | MVP Requirements |
| REQ-005 | Treat manual jobs as source signals | MVP Requirements |
| REQ-006 | Support broad API and ATS/company adapters | MVP Requirements |
| REQ-007 | Prioritize manual ingestion, one broad API, Ashby, Greenhouse, Lever | MVP Requirements |
| REQ-008 | Avoid LinkedIn scraping dependency | MVP Requirements |
| REQ-009 | Default LinkedIn URLs to no-fetch ingestion | MVP Requirements |
| REQ-010 | Normalize candidate metadata | MVP Requirements |
| REQ-011 | Deduplicate candidates | MVP Requirements |
| REQ-012 | Rank by AI Builder fit | MVP Requirements |
| REQ-013 | Show rich review card | MVP Requirements |
| REQ-014 | Fetch descriptions transiently | MVP Requirements |
| REQ-015 | Do not persist full descriptions by default | MVP Requirements |
| REQ-016 | Persist metadata, links, labels, scores, signals, notes | MVP Requirements |
| REQ-017 | Support `yes`, `maybe`, `no` labels | MVP Requirements |
| REQ-018 | Save `yes` as active opportunities | MVP Requirements |
| REQ-019 | Save `maybe` separately | MVP Requirements |
| REQ-020 | Retain `no` as negative examples | MVP Requirements |
| REQ-021 | Hide rejected jobs from normal lists by default | MVP Requirements |
| REQ-022 | Support defined review labels and lifecycle statuses | MVP Requirements |
| REQ-023 | Separate review labels from lifecycle statuses | MVP Requirements |
| REQ-024 | Support candidate, active, maybe, rejected, archived lifecycle statuses | MVP Requirements |
| REQ-025 | Preserve status and label history | MVP Requirements |
| REQ-026 | Support archiving | MVP Requirements |
| REQ-027 | Keep archive available for trends | MVP Requirements |
| REQ-028 | Show why candidates were surfaced | MVP Requirements |
| REQ-029 | Support optional structured reasons/notes | MVP Requirements |
| REQ-030 | Update review-time ranking/scoring during session | MVP Requirements |
| REQ-031 | Audit review-time learning changes | MVP Requirements |
| REQ-032 | Support proposal queue for larger changes | MVP Requirements |
| REQ-033 | Require human approval for durable logic changes | MVP Requirements |
| REQ-034 | Make review-time ranking changes reversible | MVP Requirements |
| REQ-035 | Continue on source failures | MVP Requirements |
| REQ-036 | Preserve partial metadata and source errors | MVP Requirements |
| REQ-037 | Use local storage only | MVP Requirements |
| REQ-038 | No accounts, cloud sync, or access control | MVP Requirements |
| REQ-039 | Preserve data for future trends | MVP Requirements |
| REQ-040 | Support no-new-candidate sessions | MVP Requirements |
| REQ-041 | Avoid resurfacing recently reviewed jobs by default | MVP Requirements |
| REQ-042 | Preserve completed events after interrupted review | MVP Requirements |
| REQ-043 | Stable local job IDs | Data Requirements |
| REQ-044 | Store required job metadata | Data Requirements |
| REQ-045 | Store optional job metadata when available | Data Requirements |
| REQ-046 | Store AI Builder score and surfaced reason | Data Requirements |
| REQ-047 | Store ranking signals | Data Requirements |
| REQ-048 | Store source records | Data Requirements |
| REQ-049 | Store source-listing records | Data Requirements |
| REQ-050 | Distinguish reusable and one-off sources | Data Requirements |
| REQ-051 | Store event history | Data Requirements |
| REQ-052 | Do not store full descriptions by default | Data Requirements |
| REQ-053 | Store deduplication and do-not-merge decisions | Data Requirements |
| REQ-054 | Run on demand without daemon | Non-Functional Requirements |
| REQ-055 | Default to 10 reviewed candidates | Non-Functional Requirements |
| REQ-056 | Separate job states clearly | Non-Functional Requirements |
| REQ-057 | Make scoring and learning inspectable | Non-Functional Requirements |
| REQ-058 | Avoid fragile or terms-hostile sources | Non-Functional Requirements |
| REQ-059 | Keep local files human-inspectable | Non-Functional Requirements |
| REQ-060 | Preserve future public-board export path | Non-Functional Requirements |
| REQ-061 | Support local preference settings | Non-Functional Requirements |
| REQ-062 | Classify preferences as hard filters, soft ranking inputs, or notes | Non-Functional Requirements |
| REQ-063 | Support refresh without deleting local jobs | Non-Functional Requirements |
| REQ-064 | Track precision@10 and acceptance rate | Non-Functional Requirements |
