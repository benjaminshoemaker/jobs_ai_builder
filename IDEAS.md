# Ideas

This is a lightweight, non-binding backlog. It preserves useful product directions without creating a required planning process.

## Public job board

Consider a small Next.js board only after the local curation loop is producing trustworthy data. A reasonable readiness signal is roughly 25 reviewed listings, stable Core versus Builder-Adjacent classification, working archive/status history, a stable export, and basic trend data.

The first public version could be a minimal table that links to original postings and supports keyword, work-type, experience, and industry filters. Keep the copy focused on roles that combine product judgment, technical depth, and hands-on AI-assisted building.

Before building it, investigate job-board APIs, feeds, scraping and syndication terms, expiration detection, the balance between automation and human curation, and whether the board should consume a generated static export.

## Classification quality

The current rules remain the inspectable baseline. The deeper research brief is in `features/job_classifier/INITIAL_NOTES.md` and should compare prompted classifiers, embeddings, active learning, and lightweight supervised models against a human-labeled evaluation set.

Classifier changes should remain explainable and user-approved. Candidate improvements can be proposed from review feedback, but should not silently rewrite scoring rules.

## Trends and workflow extensions

- Derive source yield, role trends, archive movement, and other reports from existing jobs and event history.
- Revisit application tracking, reminders, notes, and resume or cover-letter assistance only after the discovery and review workflow is strong.
- Consider multi-user sync, cloud hosting, and an admin UI only if this grows beyond a personal tool.
- Keep full posting snapshots out of storage by default; revisit only for a clear product need and with appropriate source/privacy constraints.
- Move from inspectable JSON/JSONL to SQLite only if query performance, migrations, or concurrency make the current approach painful.

## Boundaries

- Do not scrape authenticated LinkedIn pages.
- Do not build the public board before the curation data is credible.
- Do not automatically apply classifier proposals or make applications on the user's behalf.

