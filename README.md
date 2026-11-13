# AI Builder Jobs

A local-first CLI for reviewing AI Builder opportunities, plus a working web board in `apps/board`.

The current product exploration primarily targets U.S. roles where people combine product thinking with direct AI-assisted building and delivery, reducing handoff overhead. The broader builder category has an open set of work focuses; product, operations, software engineering and design have appeared so far. Work focus is separate from prior engineering requirements. The priority product-builder audience generally lacks substantial professional software engineering experience. Genuine product-building blends requiring engineering experience remain a distinct type. The [working definition and role boundaries](INITIAL_NOTES.md#working-definition) govern research; this README describes the existing CLI, whose classification has not been validated against the clarified definition.

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

The planned public board has a separate publishing boundary: it may store and show full descriptions from verified public employer postings when the source permits it, alongside attribution, the canonical URL, and a last-checked time. This does not change the current CLI storage or export format.

## Sources

The MVP supports:

- Jooble as the broad jobs API provider, requiring `JOOBLE_API_KEY`.
- Ashby, Greenhouse, and Lever public board adapters.
- Manual URLs.
- LinkedIn no-fetch URLs.

For the planned public board, [BOARD_SOURCING.md](BOARD_SOURCING.md) separates broad candidate discovery from employer verification and describes the initial curation loop.

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

The working public board is a separate app with its own reviewed catalog; it does not publish the legacy CLI export automatically. See [apps/board/README.md](apps/board/README.md). Advanced classifier research is tracked separately in `features/job_classifier/INITIAL_NOTES.md`.

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

## License

MIT.

## Qualifications-first prototype

`prototype` is a separate experiment using **54 user-reviewed examples**: the original 27, five later scan judgments, twelve source-hidden boundary judgments, and ten fresh-posting judgments. The [fresh review evaluation](research/fresh-review-2026-10-28.md#user-review-and-scored-outcome) preserves the original predictions separately from user labels. It stores an open set of work-focus tags separately from fit and required engineering background; older examples without an explicit focus retain an unknown focus. The later judgments are documented in the [scan notes](research/unseen-role-scan-2026-10-27.md) and [source-hidden batch labels](research/source-hidden-review-batch-1-labels-2026-10-27.json). It does not replace the legacy scorer. It shows qualifications first, then engineering requirements, product judgment, personal building, AI use, evidence and employer verification time. Fit and demanding qualifications are independent.

```bash
pnpm build
pnpm jobs prototype references
pnpm jobs prototype scan --live --board ashby:vanta --board ashby:oath --board ashby:alt --max-requests 3 --limit 15
pnpm jobs prototype show
pnpm jobs prototype review "https://example.com/job" --fit engineering_blend --focus product --reason "Owns product decisions but requires engineering experience."
```

Supported boards: `ashby:<slug>`, `greenhouse:<slug>`, `lever:<slug>`; repeat `--board` to collect several. Each board costs one request and scans every returned posting before choosing cards, without requiring a title match. Ashby requires `isListed: true`; Lever qualification lists are included. A failed fetch means unknown availability, never closed. Explicit overseas locations are withheld; ambiguous locations such as `Remote` remain flagged for confirmation. U.S. location does not establish work authorization. Separate posting IDs remain separate even when titles match.

Extraction-only mode produces **unclear** assessments with provisional passages; it does not claim to classify role fit or qualifications. Exact previously reviewed posting URLs inherit your judgments. Those examples are calibration, not a held-out accuracy test. New corrections override reference labels and model assessments on subsequent scans and `prototype show`.

The retrieval ranking favors posting-specific product and personal-building signals and uses titles as clues, not a gate. It can still surface adjacent PM and other irrelevant jobs. A bounded [unseen-role scan](research/unseen-role-scan-2026-10-27.md) found this limitation after scanning new employer boards; its top two candidates improved after a ranking repair, but the run was selected retrospectively and does not measure discovery quality.

A separate [source-hidden discovery comparison](research/source-hidden-study-2026-10-27.md) has begun with 58 candidate records. Its first, purposefully selected batch has twelve user judgments, but comparative relevance and sourcing lift remain unmeasured.

Optional AI assessment uses `OPENAI_API_KEY` from the environment or `.env.local`, plus an explicitly selected model that supports Responses structured outputs:

```bash
pnpm jobs prototype scan --live --board ashby:oath --ai --model <model-name> --max-requests 5 --limit 4
```

This sends transient posting text (up to 40,000 characters) and the current reference judgments to the OpenAI Responses API with `store: false`. Model output must pass schema checks and quote validation; positive assessments require at least two evidence passages. Refusals, incomplete output and invalid evidence retain an unclear card and record a failure. Existing user judgments skip AI calls. The integration follows [OpenAI structured-output documentation](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses). Model capability, cost and account access must be checked for the selected model; no model is chosen implicitly.

Broad retrieval can use the existing Jooble credential through repeatable `--query "<responsibility or title query>"` with `--live`. Queries use United States as the location. These results are **unverified supplier snippets**; employer-board collection is the verified route in this prototype. Supplier discovery and automated verification across previously unknown employers remain an open step. Offline `--input <file>` accepts an array of `{title, company, url, location, description}`; input is always marked unverified, and full descriptions stay transient within the command.

`--max-requests` caps **all collection and AI requests together** (default 5). A cumulative ledger at `data/api-usage/prototype.json` reserves each attempted request, including failed requests; `--api-budget` defaults to 500 and does not reset automatically. `--dry-run` makes no requests or writes. Selection limits and withheld overseas counts are reported. Results are local metadata, authored summaries and at most three short passages in `data/prototype/latest.json`; corrections live separately in `data/prototype/reviews.json`. There are no new dependencies. API/model quality and an advantage over existing job searches have not been established by this prototype.

## Working board

The board uses Next.js and Neon Free through Vercel Marketplace in a protected preview. Neon backs job records, feedback, and manual collection staging, separately from the legacy CLI's local files. Configure the ignored board environment before using database-backed features. Recurring collection and public launch remain disabled; see the board README for verified foundation status and remaining work.

Run `pnpm board:dev`, then open http://127.0.0.1:8780. The app implements URL-persistent search and filters, shareable `/roles/<id>` details, employer application links, and durable feedback with undo. Without a database, the local catalog contains six dated sample listings. The connected protected preview is seeded from the user’s historical approvals; all 54 historical judgments are retained privately. A manual maintenance loop refreshes unchanged listings, holds source differences, and records failed checks for retry. [Board operations](apps/board/README.md) explains catalog editing, publication, closure, freshness, and feedback review.
