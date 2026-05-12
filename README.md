# AI Builder Jobs

Local-first CLI for finding and reviewing AI Builder job opportunities before any public board is built.

The MVP focuses on a single-user workflow: fetch candidates, rank them with inspectable rules, review them as `yes` / `maybe` / `no`, preserve archive history, and export metadata for future use.

Status: usable local beta. It runs from source, stores data locally, and requires a Jooble API key for live broad jobs API discovery.

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

Run the CLI from the repo root with:

```bash
pnpm jobs --help
```

## Common Commands

```bash
pnpm jobs discover --live --dry-run
pnpm jobs discover --live --max-api-requests 1
pnpm jobs discover --live --max-api-requests 1 --max-description-requests 25
pnpm jobs add "https://job-boards.greenhouse.io/example/jobs/123" --title "Product Builder" --company "Example"
pnpm jobs sources add "https://jobs.ashbyhq.com/example"
pnpm jobs sources list
pnpm jobs config set --review-limit 10 --fetch-limit 50
pnpm jobs list
pnpm jobs show <jobId>
pnpm jobs search "Claude Code"
pnpm jobs review candidates
pnpm jobs review maybe --label yes
pnpm jobs archive <jobId> --reason "filled"
pnpm jobs dedupe mark-do-not-merge <jobIdA> <jobIdB>
pnpm jobs proposals list
pnpm jobs refresh
pnpm jobs export
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
- `data/api-usage`

Full job descriptions are not persisted by default. Descriptions may be fetched transiently during review so signals can be extracted, but stored records keep metadata, links, labels, scores, signals, notes, and events.

## Sources

The MVP supports:

- Jooble as the broad jobs API provider, requiring `JOOBLE_API_KEY`.
- Ashby, Greenhouse, and Lever public board adapters.
- Manual URLs.
- LinkedIn no-fetch URLs.

Source failures are recorded without deleting local jobs. `jobs refresh` updates source-listing visibility/status while preserving local archive and trend history.

## API Safety

Live API discovery is opt-in. `jobs discover` will not call Jooble unless `--live` is present.

Use a dry run first:

```bash
pnpm jobs discover --live --dry-run
```

By default, live discovery makes only one Jooble API request per run using the first configured query seed. It then fetches up to 25 shortlisted job pages to get full descriptions for scoring and review. If a Jooble page blocks direct fetching, the CLI searches for the same title/company and tries a non-Jooble result. Those description and search fetches do not use the Jooble API budget, but they are still external HTTP requests.

Increase API usage carefully:

```bash
pnpm jobs discover --live --max-api-requests 3
```

Tune or disable full-description page fetching separately:

```bash
pnpm jobs discover --live --max-description-requests 10
pnpm jobs discover --live --skip-description-fetch
pnpm jobs discover --live --skip-description-search-fallback
pnpm jobs review candidates --skip-description-search-fallback
pnpm jobs review candidates --include-without-description
```

The CLI keeps a local budget ledger in `data/api-usage/jooble.json`. The default local cap is 500 requests because Jooble documents request limits but does not clearly document the reset interval in the public REST API docs. If you need to change the cap intentionally:

```bash
pnpm jobs discover --live --api-budget 500 --max-api-requests 1
```

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
