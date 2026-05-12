# AI Builder Jobs

Local-first CLI for finding and reviewing AI Builder job opportunities before any public board is built.

The MVP focuses on a single-user workflow: fetch candidates, rank them with inspectable rules, review them as `yes` / `maybe` / `no`, preserve archive history, and export metadata for future use.

## Setup

```bash
nvm use
pnpm install
pnpm build
```

Optional live broad-API sourcing uses Jooble:

```bash
export JOOBLE_API_KEY=
```

`JOOBLE_API_KEY` is read from the environment only. It is not stored in `data/config.json` or exported snapshots.

## Common Commands

```bash
jobs discover --interactive=false
jobs add "https://job-boards.greenhouse.io/example/jobs/123" --title "Product Builder" --company "Example"
jobs sources add "https://jobs.ashbyhq.com/example"
jobs sources list
jobs config set --review-limit 10 --fetch-limit 50
jobs list
jobs show <jobId>
jobs search "Claude Code"
jobs review maybe --label yes
jobs archive <jobId> --reason "filled"
jobs dedupe mark-do-not-merge <jobIdA> <jobIdB>
jobs proposals list
jobs refresh
jobs export
```

LinkedIn is handled as no-fetch manual capture. `jobs add` can save LinkedIn URLs with user-entered metadata, but the CLI does not scrape authenticated LinkedIn pages.

## Local Data

Runtime data is stored under `data/` by default and is intentionally inspectable:

- `data/config.json`
- `data/events.jsonl`
- `data/jobs`
- `data/source-listings`
- `data/sources`
- `data/proposals`
- `data/sessions`
- `data/exports`

Full job descriptions are not persisted by default. Descriptions may be fetched transiently during review so signals can be extracted, but stored records keep metadata, links, labels, scores, signals, notes, and events.

## Sources

The MVP supports:

- Jooble as the broad jobs API provider, requiring `JOOBLE_API_KEY`.
- Ashby, Greenhouse, and Lever public board adapters.
- Manual URLs.
- LinkedIn no-fetch URLs.

Source failures are recorded without deleting local jobs. `jobs refresh` updates source-listing visibility/status while preserving local archive and trend history.

## Export

`jobs export` writes curated metadata to `data/exports/{timestamp}.json`. The export includes active, maybe, and archived jobs, source/link metadata, scores, and signal labels. It excludes full descriptions, API keys, private environment values, and local config secrets.

The public board is future work. The current MVP keeps only the export path needed for a later Next.js public board. Advanced classifier research is tracked separately in `features/job_classifier/INITIAL_NOTES.md`.

## Verification

```bash
pnpm test
pnpm typecheck
pnpm build
```

Optional focused checks:

```bash
pnpm --filter @ai-builder-jobs/cli test -- e2e-cli.test.ts
pnpm --filter @ai-builder-jobs/core test -- export.test.ts no-description-persistence.test.ts
```
