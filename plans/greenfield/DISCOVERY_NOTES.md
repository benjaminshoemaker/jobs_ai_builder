# Discovery Notes

Generated: 2026-05-12
Source: /discover conversation

## Idea Summary

AI Builder Jobs should start as a CLI-first discovery and curation tool for finding personally relevant "AI Builder" job opportunities. The public job board is intentionally deferred until the CLI has learned a reliable way to identify the category.

The core product is a feedback loop: source broad candidate jobs from APIs, feeds, and manually discovered URLs; show them interactively; capture lightweight human feedback; save high-signal roles; and propose improvements to the feed and classification logic over time. The first version optimizes for finding roles for the user personally, especially roles they would not have found through LinkedIn or startups.gallery alone.

## Key Decisions

- **Problem:** AI Builder roles are scattered, inconsistently titled, and hard to distinguish from generic PM, product engineering, AI PM, DevRel, ML, automation, or normal software engineering roles. The tool should centralize them and learn the user's definition through feedback.
- **Audience:** First user is the project owner personally. Future audiences include people looking for similar AI Builder roles and readers interested in the category trend, but public publishing is deferred.
- **Platform:** CLI-first. The public board is a future Next.js surface once the sourcing and classification logic is strong enough.
- **Stack preferences:** Next.js is preferred for the deferred public board, partly because patterns from `~/Projects/fast_pr_analytics` may be useful later. The CLI implementation stack is still open.
- **MVP scope:** On-demand CLI runs that source candidate jobs, present them for review, accept quick feedback, and save promising opportunities with metadata and links. No application tracking, reminders, or admin UI in the first version.
- **Exciting part:** Building a learning loop that sharpens the definition of "AI Builder" over time and surfaces roles the user would not otherwise find.

## Current Product Shape

The first version should support:

- Searching or ingesting jobs from external APIs and feeds.
- Ingesting manually found URLs from LinkedIn, startups.gallery, X/Twitter, company pages, or job boards.
- Treating manually found jobs as source-discovery signals, not just one-off saved records.
- Interactive review of candidate jobs.
- Lightweight labels by default: `yes`, `maybe`, `no`.
- Optional structured reasons when they are worth capturing.
- Saving only metadata and links, not full posting snapshots.
- Preserving archive/status history for future trend analysis.
- Proposing changes to sourcing or classification logic instead of applying them automatically.

## Classification Direction

The first-rank signal is the AI Builder nature of the work, before salary, seniority, company prestige, or logistics.

Strong AI Builder roles combine:

- Product discovery or ambiguous problem ownership.
- Building real functionality, either internal or customer-facing.
- Agent implementation, LLM workflows, or AI-native build mechanics.
- Production ownership, not only prototypes or mocks.

The current exclusion line is strict:

- Pure AI product manager roles are outside the category.
- Pure ML engineer roles are outside the category.
- Prompt-engineering/content roles are outside the category.
- Generic automation roles are outside the category.
- DevRel roles are outside the category.
- Normal full-stack roles at AI companies are outside the category.

Product Engineer roles are the important boundary case. Include them only when AI agents or AI coding tools are structural to how the role builds and ships software, not merely a productivity boost or a nice-to-have. The posting should combine product ownership, shipped functionality, and AI-native build mechanics.

Useful include signals from discussion and external search:

- Explicit tools such as Claude Code, Cursor, Codex, Replit, Lovable, MCP, agents, multi-agent workflows, or similar.
- Language such as "direct AI coding agents," "orchestrate agents," "AI generates the majority of our code," "build with AI coding agents," or "not writing every line by hand."
- Product taste, systems thinking, rapid shipping, and ownership from problem discovery to working software.
- A production-quality bar: tests, reviews, architecture judgment, maintainability, customer feedback, or operational responsibility.

Weak signals by themselves:

- "We use Cursor."
- "AI company hiring product engineer."
- "Move fast with AI."
- "Vibe coding" without production ownership or engineering discipline.

## Feedback And Learning

The CLI should learn from review data, but changes to the logic should be human-approved.

Early learning can be inspectable rather than model-heavy:

- Better source queries.
- Better source prioritization.
- Better inclusion and exclusion examples.
- Better scoring weights.
- Better LLM classification prompts.
- Better threshold proposals.
- Better negative examples.

Later, the project should research stronger approaches such as active learning, human feedback loops, lightweight classifiers, evaluation sets, and whether Karpathy-style autoresearch or similar research agents can help design the technical approach.

## Success Criteria

The first useful version works if:

- It gathers relevant roles into one place.
- It surfaces roles the user was not finding through LinkedIn and startups.gallery.
- It reduces time spent wading through generic AI, PM, SWE, DevRel, or product engineering listings.
- It gives clear reasons why a candidate was surfaced.
- It creates a reusable labeled dataset for improving the feed.

## Known Current Sources

The user currently finds these roles mainly through:

- LinkedIn.
- https://startups.gallery/jobs

That means early value can come from broadening source coverage before building an especially sophisticated classifier.

## Seed Listings

- Knotch: Product Builder ($160-180K) - https://www.linkedin.com/jobs/view/4412317108/
- Hello Heart: Senior AI Builder - https://www.linkedin.com/jobs/view/4403537044/
- Tiger Data/Ghost: Builder in Residence - https://jobs.ashbyhq.com/TigerData/dbfd8ad3-fe92-4e1e-a133-263544ec42f2
- Owner.com: Product Builder - https://jobs.ashbyhq.com/owner/1912d8d8-b37f-4330-91ea-bb428d091322
- ShopMy: Senior Product Builder-Brand - https://job-boards.greenhouse.io/shopmy/jobs/5153099008
- Impiricus: AI Solutions Builder ($165-210K) - https://job-boards.greenhouse.io/impiricus/jobs/5214167008

## Open Questions

- Which job APIs and feeds should be used first?
- What are the source terms and practical limits for each API/feed?
- Should the CLI use a paid normalized jobs API before building adapters?
- What metadata is enough for learning if full posting snapshots are not stored?
- What optional reason labels should be available after `yes`, `maybe`, or `no`?
- How should manually found roles become reusable source-discovery signals?
- What is the right format for proposed changes to classification logic?
- What evaluation set is needed before trusting the feed enough for a public board?
- How should product engineering boundary cases be reviewed and documented?
- What is the best technical approach to the learning loop: rules, prompts, active learning, classifier, or a hybrid?
- Can Karpathy-style autoresearch or similar research-agent workflows help design the learning/classification approach?

## Existing Solutions & Tools

### Use Directly

None found that solve the full problem. Existing tools cover job sourcing, public-board publishing, or active-learning feedback, but not the complete CLI-first workflow of sourcing jobs, interactively labeling `yes`/`maybe`/`no`, improving a niche AI Builder classifier, and later publishing a public board.

### Leverage

- **JobMatch Bot** - https://github.com/thalaai/jobmatch-bot
  - AI-assisted Python pipeline for aggregating, normalizing, deduplicating, and ranking jobs from ATS and company career sources.
  - Relevant as a possible ingestion and ranking reference because it already has CLI-oriented architecture, ATS adapters, CSV/Markdown review outputs, diagnostics, and scoring.

- **JobSpy** - https://github.com/speedyapply/JobSpy
  - Python scraping library that pulls postings from LinkedIn, Indeed, Glassdoor, Google, ZipRecruiter, and others into a dataframe.
  - Relevant as a sourcing layer if broad aggregator coverage is more valuable than source-specific adapters early on. Scraping reliability and legal/terms risk need care.

- **Ever Jobs** - https://github.com/ever-jobs/ever-jobs
  - Open-source multi-country job/gig aggregator with source support across RSS feeds, public APIs, and ATS platforms such as Greenhouse, Lever, Workday, Ashby, and SmartRecruiters.
  - Relevant for its source catalog and adapter model.

- **JobDataPool** - https://jobdatapool.com/
  - Public job data infrastructure with a jobs API, source metadata, JSON schemas, OpenAPI docs, and CSV snapshots.
  - Relevant if the first version should focus on niche classification and feedback instead of building crawlers.

- **Argilla** - https://github.com/argilla-io/argilla
  - Open-source human feedback and dataset management tool for text classification, semantic search, and continuous model improvement.
  - Relevant if the CLI feedback loop outgrows a simple local review flow.

### Take Inspiration From

- **OpenJobs** - https://github.com/digidai/openjobs
  - Open-source job aggregator that auto-updates via GitHub Actions and publishes a lightweight public job board.
  - Relevant later for zero-infrastructure public-board publishing patterns.

- **ASReview LAB** - https://github.com/asreview/asreview
  - Open-source active-learning screening tool for large textual datasets where user labels prioritize future records.
  - Relevant because its review loop maps closely to showing candidate postings, capturing judgment, and improving what gets reviewed next.

## Deferred Public Board

The public board should remain deferred until the CLI logic is reliable.

Future public board direction:

- Name: AI Builder Jobs.
- Framework: Next.js.
- Design reference: https://startups.gallery/jobs
- Listings link out to original postings.
- Public data likely comes from an export of the curated CLI dataset.

Potential launch threshold:

- Enough reviewed jobs to evaluate the classifier.
- Clear Core AI Builder vs Builder-Adjacent criteria.
- Archive/status history working.
- Feed quality good enough to avoid publishing generic AI/PM/SWE listings.

## Raw Context

- "I think we should start with a CLI tool that I can use myself."
- "I want a feature of the CLI to be that it learns how to identify these jobs."
- "The public job board will be once we get that logic nailed down; but we have to do that first."
- "Let's start with find opportunities for myself."
- "I think if it helped me find all the roles in a single place, as well as (qualitatively) it found me roles I wasn't finding otherwise - that would be highly value."
- "Propose changes."

