# Execution Plan: AI Builder Jobs CLI

## Overview

| Metric | Value |
|--------|-------|
| Feature | AI Builder Jobs CLI |
| Target Project | jobs_ai_builder |
| Total Phases | 5 |
| Total Steps | 10 |
| Total Tasks | 27 |

## Integration Points

| Existing Component | Integration Type | Notes |
|--------------------|------------------|-------|
| `plans/greenfield/PRODUCT_SPEC.md` | uses | Product requirements REQ-001 through REQ-064 drive task scope. |
| `plans/greenfield/TECHNICAL_SPEC.md` | uses | Technical contracts for workspace, storage, adapters, scoring, CLI, and tests. |
| Jooble API | extends | First broad jobs API adapter; requires `JOOBLE_API_KEY` for live source tests. |
| Ashby, Greenhouse, Lever public boards | extends | ATS adapters normalize public job-board payloads into shared candidates. |
| Future Next.js public board | enables | `jobs export` preserves metadata-only output for later public-board ingestion. |

## Phase Dependency Graph

```text
Phase 1: Foundation and local data
  -> Phase 2: Scoring and identity
    -> Phase 3: Sources and discovery
      -> Phase 4: Review and job management
        -> Phase 5: Learning, export, and hardening
```

---

## Phase 1: Foundation And Local Data

**Goal:** Create the TypeScript/pnpm CLI workspace, core data contracts, storage repository, config loading, and event log needed by every later phase.
**Depends On:** None

### Pre-Phase Setup

Human must complete before starting:

- [ ] Node.js 22.12 or newer is available.
  - Verify: `cd ../.. && node -e "const [maj,min]=process.versions.node.split('.').map(Number); process.exit(maj>22 || (maj===22 && min>=12) ? 0 : 1)"`
- [ ] pnpm is available.
  - Verify: `cd ../.. && pnpm --version`
- [ ] Repository is initialized for task commits.
  - Verify: `cd ../.. && git rev-parse --is-inside-work-tree`

### Step 1.1: Workspace Scaffold

**Depends On:** None

---

#### Task 1.1.A: Scaffold pnpm Workspace And Package Scripts

**Description:**
Create the root pnpm workspace, TypeScript configuration, CLI package, and core package. The first task should establish the package names and verification scripts that all later tasks rely on.

**Requirement:** REQ-001, REQ-054

**Acceptance Criteria:**

- [x] (CODE) Root workspace manifests exist with package scripts for `build`, `test`, and `typecheck`.
  - Verify: `cd ../.. && test -f package.json && test -f pnpm-workspace.yaml && test -f tsconfig.base.json && node -e "const p=require('./package.json'); if(!p.scripts?.build||!p.scripts?.test||!p.scripts?.typecheck) process.exit(1)"`
- [x] (CODE) CLI and core package manifests exist with the planned package names.
  - Verify: `cd ../.. && node -e "const cli=require('./apps/cli/package.json'); const core=require('./packages/core/package.json'); if(cli.name!=='@ai-builder-jobs/cli'||core.name!=='@ai-builder-jobs/core') process.exit(1)"`
- [x] (TYPE) The empty scaffold typechecks.
  - Verify: `cd ../.. && pnpm typecheck`
- [x] (BUILD) The empty scaffold builds.
  - Verify: `cd ../.. && pnpm build`
- [x] (TEST) The scaffold test command runs at least one smoke test.
  - Verify: `cd ../.. && pnpm test`

**Files to Create:**

- `package.json` - root workspace scripts and package manager.
- `pnpm-workspace.yaml` - workspace package globs.
- `tsconfig.base.json` - shared TypeScript options.
- `apps/cli/package.json` - CLI package manifest.
- `apps/cli/src/index.ts` - CLI entrypoint placeholder.
- `packages/core/package.json` - core package manifest.
- `packages/core/src/index.ts` - core exports placeholder.
- `packages/core/src/smoke.test.ts` - initial test harness.
- `.gitignore` - excludes dependencies, build output, env files, and runtime data.

**Files to Modify:**

- None

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Repository Structure and Technology Choices.

**Dependencies:**

- Pre-phase setup.

**Spec Reference:** `TECHNICAL_SPEC.md` - Repository Structure, Technology Choices

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only phase.

---

#### Task 1.1.B: Implement CLI Shell And Command Routing

**Description:**
Add the Commander-based CLI shell and command registration structure. Commands can initially return not-implemented messages, but routing must be stable enough for later tasks to fill in behavior without changing command names.

**Requirement:** REQ-001, REQ-002, REQ-004, REQ-054

**Acceptance Criteria:**

- [x] (CODE) The CLI exports a `runCli` or equivalent command runner used by the bin entrypoint.
  - Verify: `cd ../.. && rg -n "runCli|program\\.command|new Command" apps/cli/src`
- [x] (CODE) MVP command names are registered: `discover`, `add`, `list`, `review`, `show`, `archive`, `search`, `proposals`, `sources`, `config`, `dedupe`, `refresh`, and `export`.
  - Verify: `cd ../.. && for c in discover add list review show archive search proposals sources config dedupe refresh export; do rg -q "\\b$c\\b" apps/cli/src || exit 1; done`
- [x] (TEST) CLI help output includes the MVP commands.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- cli-help.test.ts`
- [x] (TYPE) CLI command registration typechecks.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `apps/cli/src/cli.ts` - Commander setup and command registration.
- `apps/cli/src/commands/index.ts` - command registration module.
- `apps/cli/src/cli-help.test.ts` - command help test.

**Files to Modify:**

- `apps/cli/src/index.ts` - invoke CLI runner.
- `apps/cli/package.json` - bin entry and test script wiring.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - CLI Contracts.

**Dependencies:**

- Task 1.1.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - CLI Contracts

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Step 1.2: Data Contracts And Persistence

**Depends On:** Step 1.1

---

#### Task 1.2.A: Define Core Schemas And Domain Types

**Description:**
Implement the Zod schemas and inferred TypeScript types for jobs, source listings, sources, config, scoring rules, events, proposals, sessions, and do-not-merge records. These schemas are the boundary between CLI behavior, adapter payloads, and local JSON files.

**Requirement:** REQ-010, REQ-022, REQ-023, REQ-024, REQ-043, REQ-044, REQ-045, REQ-046, REQ-047, REQ-048, REQ-049, REQ-050, REQ-051, REQ-053, REQ-059

**Acceptance Criteria:**

- [x] (CODE) Schema files export Zod schemas and inferred types for every record named in the technical spec.
  - Verify: `cd ../.. && for n in JobRecord SourceListingRecord SourceRecord AppConfig EventRecord ProposalRecord SessionRecord DoNotMergeRecord ScoringRulesRecord; do rg -q "$n" packages/core/src || exit 1; done`
- [x] (TEST) Schema tests accept valid fixtures for every record type.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- schemas.test.ts`
- [x] (TEST) Schema tests reject invalid review labels, lifecycle statuses, preference modes, and source listing statuses.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- schemas.test.ts`
- [x] (TYPE) Schema exports are available through the core package entrypoint.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/schemas/types.ts` - shared literal types.
- `packages/core/src/schemas/job.ts` - canonical job schema.
- `packages/core/src/schemas/source.ts` - source and source listing schemas.
- `packages/core/src/schemas/config.ts` - app config and scoring rules schemas.
- `packages/core/src/schemas/event.ts` - event schema.
- `packages/core/src/schemas/proposal.ts` - proposal schema.
- `packages/core/src/schemas/session.ts` - session schema.
- `packages/core/src/schemas/dedupe.ts` - do-not-merge schema.
- `packages/core/src/schemas/index.ts` - schema exports.
- `packages/core/src/schemas/schemas.test.ts` - schema fixture tests.

**Files to Modify:**

- `packages/core/src/index.ts` - export schemas.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Data Storage.

**Dependencies:**

- Task 1.1.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - Data Storage

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 1.2.B: Implement Local Storage Repository And Event Log

**Description:**
Create the file-based storage layer for JSON entities and append-only JSONL events. This repository must validate reads and writes, use atomic JSON writes, tolerate a trailing partial event line, and preserve invalid files instead of overwriting them.

**Requirement:** REQ-016, REQ-025, REQ-031, REQ-037, REQ-039, REQ-051, REQ-059

**Acceptance Criteria:**

- [x] (CODE) Storage paths match the technical spec under a configurable data directory.
  - Verify: `cd ../.. && rg -n "jobs|source-listings|sources|proposals|sessions|do-not-merge|events\\.jsonl|scoring-rules" packages/core/src/storage`
- [x] (TEST) JSON entity writes use a temporary file and rename path.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- storage.test.ts`
- [x] (TEST) Event log tests validate complete lines, ignore only a trailing partial line, and fail on invalid non-final lines.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- event-log.test.ts`
- [x] (TEST) Storage tests prove invalid files are not overwritten after Zod validation failure.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- storage.test.ts`
- [x] (TYPE) Storage repository APIs typecheck against the schemas.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/storage/paths.ts` - data path helpers.
- `packages/core/src/storage/jsonRepository.ts` - atomic JSON entity storage.
- `packages/core/src/storage/eventLog.ts` - JSONL event storage.
- `packages/core/src/storage/index.ts` - storage exports.
- `packages/core/src/storage/storage.test.ts` - JSON storage tests.
- `packages/core/src/storage/event-log.test.ts` - event log tests.

**Files to Modify:**

- `packages/core/src/index.ts` - export storage APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Storage Principles and Event Log.

**Dependencies:**

- Task 1.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - Data Storage, Error Handling

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 1.2.C: Implement Config, Defaults, And Environment Loading

**Description:**
Add config creation, config validation, default query seeds, scoring-rule defaults, and environment-variable based secret loading. API keys must be read from environment variables only and never persisted into config, events, exports, or logs.

**Requirement:** REQ-006, REQ-035, REQ-037, REQ-038, REQ-058, REQ-061, REQ-062

**Acceptance Criteria:**

- [x] (CODE) Default config includes review limit 10, fetch limit 50, 24 hour cooldown, Jooble provider, query seeds, and preference modes.
  - Verify: `cd ../.. && rg -n "reviewLimit|fetchLimit|sourceCooldownHours|jooble|querySeeds|hard_filter|soft_rank|note_only" packages/core/src/config`
- [x] (TEST) Config tests create defaults when `data/config.json` is absent and preserve user-edited config when valid.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- config.test.ts`
- [x] (TEST) Environment tests read the configured credential env var without writing secret values to local data.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- config-env.test.ts`
- [x] (TEST) Preference mode tests cover `hard_filter`, `soft_rank`, and `note_only` validation.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- config.test.ts`
- [x] (TYPE) Config APIs typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/config/defaults.ts` - default app config and query seeds.
- `packages/core/src/config/env.ts` - environment credential lookup.
- `packages/core/src/config/configRepository.ts` - config read/write service.
- `packages/core/src/config/scoringRules.ts` - default scoring rules.
- `packages/core/src/config/config.test.ts` - config tests.
- `packages/core/src/config/config-env.test.ts` - environment tests.

**Files to Modify:**

- `packages/core/src/index.ts` - export config APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Config, Scoring Rules, Security And Privacy.

**Dependencies:**

- Task 1.2.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - Data Storage, Security And Privacy

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Phase 1 Checkpoint

**Automated Checks:**

- [x] (TEST) Unit tests pass.
  - Verify: `cd ../.. && pnpm test`
- [x] (TYPE) Type checking passes.
  - Verify: `cd ../.. && pnpm typecheck`
- [x] (BUILD) Build passes.
  - Verify: `cd ../.. && pnpm build`

**Regression Verification:**

- [x] (CODE) No full job descriptions or API secrets are stored in committed runtime data.
  - Verify: `cd ../.. && test ! -d data && ! rg -n "JOOBLE_API_KEY|fullDescription|descriptionText" data 2>/dev/null`

---

## Phase 2: Scoring And Identity

**Goal:** Implement deterministic AI Builder scoring, preference handling, transient description signal extraction, deduplication, source listings, and do-not-merge protection.
**Depends On:** Phase 1

### Pre-Phase Setup

Human must complete before starting:

- [x] Phase 1 verification passes.
  - Verify: `cd ../.. && pnpm test && pnpm typecheck && pnpm build`

### Step 2.1: Rules-Based Scoring

**Depends On:** Phase 1

---

#### Task 2.1.A: Implement Rules-Based Scoring And Preference Evaluation

**Description:**
Build the 0-100 deterministic scorer with weighted buckets for title, AI tools, product/build signals, agent/LLM signals, production ownership, exclusions, preferences, and source quality. Preference handling must respect hard filters, soft ranking, and note-only semantics.

**Requirement:** REQ-012, REQ-028, REQ-046, REQ-047, REQ-057, REQ-061, REQ-062

**Acceptance Criteria:**

- [x] (CODE) The scorer returns `ScoreResult` with total, buckets, positive signals, negative signals, surfaced reason, timestamp, and scoring version.
  - Verify: `cd ../.. && rg -n "ScoreResult|buckets|positiveSignals|negativeSignals|surfacedReason|scoringVersion" packages/core/src/scoring`
- [x] (TEST) Scoring tests cover positive title, AI tool, product/build, agent/LLM, production ownership, source quality, and exclusion signals.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- scoring.test.ts`
- [x] (TEST) Preference tests prove hard filters remove only clear violations, soft rank changes points, and note-only creates no score change.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- preferences.test.ts`
- [x] (TEST) Score totals are clamped to 0 through 100.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- scoring.test.ts`
- [x] (TYPE) Scoring APIs typecheck against config and schema types.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/scoring/scorer.ts` - score calculation.
- `packages/core/src/scoring/signals.ts` - signal definitions and extraction helpers.
- `packages/core/src/scoring/preferences.ts` - preference evaluation.
- `packages/core/src/scoring/scoring.test.ts` - scoring tests.
- `packages/core/src/scoring/preferences.test.ts` - preference tests.

**Files to Modify:**

- `packages/core/src/index.ts` - export scoring APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Rules-Based Scoring.

**Dependencies:**

- Task 1.2.A and Task 1.2.C.

**Spec Reference:** `TECHNICAL_SPEC.md` - Rules-Based Scoring

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 2.1.B: Extract Transient Description Signals Without Persisting Descriptions

**Description:**
Add description-signal extraction that can use fetched descriptions during a review session while persisting only signal metadata. This keeps review rich enough to evaluate roles while preserving the default no-full-description storage policy.

**Requirement:** REQ-013, REQ-014, REQ-015, REQ-028, REQ-052

**Acceptance Criteria:**

- [x] (CODE) Description extraction accepts transient text and returns signal IDs, labels, weights, and source metadata without returning full text for persistence.
  - Verify: `cd ../.. && rg -n "transientDescription|description.*Signal|source: \\\"description\\\"" packages/core/src/scoring`
- [x] (TEST) Description tests identify AI coding tools, agentic workflows, product discovery, shipping ownership, and exclusion language.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- description-signals.test.ts`
- [x] (TEST) Persistence tests prove full description text is not written to job, source listing, event, session, proposal, or export records.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- no-description-persistence.test.ts`
- [x] (TYPE) Description-signal APIs integrate with `ScoreResult`.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/scoring/descriptionSignals.ts` - transient description signal extraction.
- `packages/core/src/scoring/description-signals.test.ts` - description signal tests.
- `packages/core/src/storage/no-description-persistence.test.ts` - persistence policy tests.

**Files to Modify:**

- `packages/core/src/scoring/scorer.ts` - include description-derived signals.

**Existing Code to Reference:**

- `PRODUCT_SPEC.md` - Classification Definition.
- `TECHNICAL_SPEC.md` - Description Handling.

**Dependencies:**

- Task 2.1.A and Task 1.2.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - Description Handling

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Step 2.2: Deduplication And Identity

**Depends On:** Step 2.1

---

#### Task 2.2.A: Implement Candidate Normalization, Deduplication, And Source Listings

**Description:**
Build the normalizer and deduper that map raw source candidates into canonical jobs and source listing records. Matching should use source external IDs, normalized URLs, and normalized company/title/location/work-type combinations.

**Requirement:** REQ-010, REQ-011, REQ-036, REQ-043, REQ-044, REQ-045, REQ-048, REQ-049, REQ-050

**Acceptance Criteria:**

- [x] (CODE) Normalization code covers company, title, URL, location, and remote work strings.
  - Verify: `cd ../.. && rg -n "normalizeCompany|normalizeTitle|normalizeUrl|normalizeLocation|remote" packages/core/src/dedupe packages/core/src/normalize`
- [x] (TEST) Deduplication tests merge same external ID, same normalized URL, and same normalized company/title with overlapping location or work type.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- dedupe.test.ts`
- [x] (TEST) Deduplication tests keep separate listings when company/title match but location or work type differs without source proof.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- dedupe.test.ts`
- [x] (TEST) Source listing tests preserve partial metadata and source error state.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- source-listings.test.ts`
- [x] (TYPE) Normalized candidates typecheck against storage schemas.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/normalize/candidate.ts` - shared candidate normalization.
- `packages/core/src/dedupe/canonicalize.ts` - canonical keys.
- `packages/core/src/dedupe/deduper.ts` - merge/new-job decisions.
- `packages/core/src/dedupe/dedupe.test.ts` - dedupe tests.
- `packages/core/src/storage/source-listings.test.ts` - source listing storage tests.

**Files to Modify:**

- `packages/core/src/index.ts` - export normalize and dedupe APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Deduplication and Data Storage.

**Dependencies:**

- Task 1.2.A and Task 1.2.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - Deduplication

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 2.2.B: Implement Do-Not-Merge Decisions

**Description:**
Persist user-entered do-not-merge records and make dedupe check them before automatic merges. This protects the archive and future trend data from incorrect identity decisions.

**Requirement:** REQ-011, REQ-025, REQ-051, REQ-053

**Acceptance Criteria:**

- [x] (CODE) Core service can create, list, and check order-independent do-not-merge pairs.
  - Verify: `cd ../.. && rg -n "DoNotMerge|doNotMerge|do-not-merge" packages/core/src`
- [x] (TEST) Tests prove `jobA/jobB` and `jobB/jobA` resolve to the same do-not-merge decision.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- do-not-merge.test.ts`
- [x] (TEST) Deduper tests prove recorded pairs are never auto-merged.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- dedupe.test.ts`
- [x] (TEST) Creating a do-not-merge decision writes `job.do_not_merge_created`.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- do-not-merge.test.ts`
- [x] (TYPE) Do-not-merge services typecheck with storage APIs.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/dedupe/doNotMerge.ts` - do-not-merge service.
- `packages/core/src/dedupe/do-not-merge.test.ts` - do-not-merge tests.

**Files to Modify:**

- `packages/core/src/dedupe/deduper.ts` - respect do-not-merge decisions.
- `packages/core/src/index.ts` - export do-not-merge APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Do Not Merge.

**Dependencies:**

- Task 2.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - Do Not Merge

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Phase 2 Checkpoint

**Automated Checks:**

- [x] (TEST) Unit tests pass.
  - Verify: `cd ../.. && pnpm test`
- [x] (TYPE) Type checking passes.
  - Verify: `cd ../.. && pnpm typecheck`
- [x] (BUILD) Build passes.
  - Verify: `cd ../.. && pnpm build`

**Regression Verification:**

- [x] (TEST) No-description persistence tests still pass.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- no-description-persistence.test.ts`
- [x] (TEST) Dedupe and scoring tests pass together.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- dedupe.test.ts scoring.test.ts`

---

## Phase 3: Sources And Discovery

**Goal:** Implement manual, LinkedIn no-fetch, ATS, and Jooble source adapters, then wire them into non-interactive discovery and source/config management commands.
**Depends On:** Phase 2

### Pre-Phase Setup

Human must complete before starting:

- [x] Phase 2 verification passes.
  - Verify: `cd ../.. && pnpm test && pnpm typecheck && pnpm build`
- [x] Jooble API key is available for live source tests, or live tests will remain skipped.
  - Verify: `cd ../.. && test -n "$JOOBLE_API_KEY" || echo "JOOBLE_API_KEY not set; live Jooble tests will be skipped"`

### Step 3.1: Source Adapters

**Depends On:** Phase 2

---

#### Task 3.1.A: Implement Source Adapter Registry, Manual Adapter, And LinkedIn No-Fetch Adapter

**Description:**
Create the source adapter interface, registry, manual ingestion adapter, and LinkedIn no-fetch adapter. Manual URLs must become candidate records and reusable source-discovery signals when the user marks them reusable.

**Requirement:** REQ-004, REQ-005, REQ-006, REQ-008, REQ-009, REQ-048, REQ-050, REQ-058

**Acceptance Criteria:**

- [x] (CODE) Adapter interface includes `fetchCandidates`, optional `fetchByUrl`, optional `refreshListing`, and `testSource`.
  - Verify: `cd ../.. && rg -n "interface SourceAdapter|fetchCandidates|fetchByUrl|refreshListing|testSource" packages/core/src/sources`
- [x] (TEST) Manual adapter tests convert URL plus entered metadata into a source candidate and source signal.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- manual-adapter.test.ts`
- [x] (TEST) LinkedIn adapter tests prove LinkedIn URLs use no-fetch behavior and prompt-compatible minimal metadata.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- linkedin-adapter.test.ts`
- [x] (TEST) Registry tests select enabled adapters and skip disabled sources.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- source-registry.test.ts`
- [x] (TYPE) Adapter registry typechecks.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/sources/types.ts` - adapter contracts.
- `packages/core/src/sources/registry.ts` - source registry.
- `packages/core/src/sources/manualAdapter.ts` - manual adapter.
- `packages/core/src/sources/linkedinManualAdapter.ts` - LinkedIn no-fetch adapter.
- `packages/core/src/sources/manual-adapter.test.ts` - manual adapter tests.
- `packages/core/src/sources/linkedin-adapter.test.ts` - LinkedIn tests.
- `packages/core/src/sources/source-registry.test.ts` - registry tests.

**Files to Modify:**

- `packages/core/src/index.ts` - export source APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Source Adapter Design.

**Dependencies:**

- Task 1.2.C and Task 2.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - MVP Adapters

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 3.1.B: Implement Ashby, Greenhouse, And Lever Adapters

**Description:**
Add public ATS adapter support for Ashby, Greenhouse, and Lever using fixture-backed tests and mocked HTTP. These adapters should normalize ATS-specific fields into the shared source candidate shape.

**Requirement:** REQ-006, REQ-007, REQ-010, REQ-035, REQ-036, REQ-048, REQ-049

**Acceptance Criteria:**

- [x] (CODE) Ashby, Greenhouse, and Lever adapters are registered by adapter ID.
  - Verify: `cd ../.. && for a in AshbyAdapter GreenhouseAdapter LeverAdapter; do rg -q "$a" packages/core/src/sources || exit 1; done`
- [x] (TEST) Fixture tests normalize title, company, location, posted date, source URL, and external ID for each ATS.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- ats-adapters.test.ts`
- [x] (TEST) Adapter tests cover unavailable, rate-limited, and malformed payload paths without crashing discovery services.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- ats-adapters.test.ts`
- [x] (CODE) Fixture payloads are checked into `packages/core/src/sources/fixtures`.
  - Verify: `cd ../.. && test -d packages/core/src/sources/fixtures && find packages/core/src/sources/fixtures -type f | grep -E 'ashby|greenhouse|lever'`
- [x] (TYPE) ATS adapters typecheck against `SourceAdapter`.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/sources/ashbyAdapter.ts` - Ashby adapter.
- `packages/core/src/sources/greenhouseAdapter.ts` - Greenhouse adapter.
- `packages/core/src/sources/leverAdapter.ts` - Lever adapter.
- `packages/core/src/sources/ats-adapters.test.ts` - ATS adapter tests.
- `packages/core/src/sources/fixtures/` - fixture payloads.

**Files to Modify:**

- `packages/core/src/sources/registry.ts` - register ATS adapters.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - MVP Adapters.

**Dependencies:**

- Task 3.1.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - MVP Adapters

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 3.1.C: Implement Jooble Broad API Adapter And Source Failure Handling

**Description:**
Implement Jooble as the first broad jobs API adapter with configurable provider settings. The adapter must support mocked tests by default, optional live tests when `JOOBLE_API_KEY` is present, and partial-source behavior when the broad API is unavailable.

**Requirement:** REQ-006, REQ-007, REQ-035, REQ-036, REQ-040, REQ-058

**Acceptance Criteria:**

- [x] (CODE) Jooble adapter reads credentials from the configured environment variable and never from persisted config.
  - Verify: `cd ../.. && rg -n "broadApiCredentialEnvVar|process\\.env|JOOBLE_API_KEY" packages/core/src/sources packages/core/src/config`
- [x] (TEST) Jooble fixture tests normalize returned candidates into shared metadata.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- jooble-adapter.test.ts`
- [x] (TEST) Missing-key tests enforce non-zero discover behavior unless partial sources are explicitly allowed.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- source-failures.test.ts`
- [x] (TEST) Rate-limit and source failure tests write source error details and continue when at least one source succeeds.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- source-failures.test.ts`
- [x] (TYPE) Jooble adapter typechecks against `SourceAdapter`.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/sources/joobleAdapter.ts` - Jooble adapter.
- `packages/core/src/sources/jooble-adapter.test.ts` - Jooble fixture tests.
- `packages/core/src/sources/source-failures.test.ts` - source failure tests.

**Files to Modify:**

- `packages/core/src/sources/registry.ts` - register Jooble adapter.
- `packages/core/src/config/defaults.ts` - provider defaults.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Broad API Strategy and Error Handling.

**Dependencies:**

- Task 3.1.A and Task 1.2.C.

**Spec Reference:** `TECHNICAL_SPEC.md` - Broad API Strategy, Error Handling

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Step 3.2: Discovery And Source Commands

**Depends On:** Step 3.1

---

#### Task 3.2.A: Implement Non-Interactive Discover Pipeline

**Description:**
Wire adapters, candidate selection, dedupe, scoring, and storage into `jobs discover --interactive=false`. This creates the first end-to-end path for fetching many candidates, ranking them, and persisting candidates without starting prompt-based review.

**Requirement:** REQ-002, REQ-003, REQ-010, REQ-011, REQ-012, REQ-035, REQ-036, REQ-040, REQ-041, REQ-055

**Acceptance Criteria:**

- [x] (CODE) Discover service implements fetch limit, per-source quota or round-robin fill, cooldown skipping, dedupe, scoring, and top review-limit selection.
  - Verify: `cd ../.. && rg -n "fetchLimit|reviewLimit|round|cooldown|dedupe|score" packages/core/src/discovery apps/cli/src`
- [x] (TEST) Discovery tests retrieve up to 50 candidates by default and select the top 10 after scoring.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- discovery.test.ts`
- [x] (TEST) Discovery tests avoid resurfacing recently reviewed, rejected, or archived jobs unless include flags are set.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- discovery.test.ts`
- [x] (TEST) No-new-candidate sessions exit successfully and record session metrics.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- discovery.test.ts`
- [x] (TEST) CLI integration test covers `jobs discover --interactive=false` with mocked sources and temp data.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- discover-command.test.ts`

**Files to Create:**

- `packages/core/src/discovery/discoverService.ts` - discovery orchestration.
- `packages/core/src/discovery/candidateSelection.ts` - source quotas and ranking selection.
- `packages/core/src/discovery/discovery.test.ts` - discovery service tests.
- `apps/cli/src/commands/discover.ts` - discover command.
- `apps/cli/src/commands/discover-command.test.ts` - CLI integration test.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register discover command implementation.
- `packages/core/src/index.ts` - export discovery APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Candidate Selection and CLI Contracts.

**Dependencies:**

- Task 2.2.A, Task 3.1.A, Task 3.1.B, and Task 3.1.C.

**Spec Reference:** `TECHNICAL_SPEC.md` - Candidate Selection, `jobs discover`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 3.2.B: Implement Manual Add Command

**Description:**
Implement `jobs add <url>` so manually found jobs can be ingested and saved as candidates. This command provides the first daily workflow for adding LinkedIn or ATS roles found outside automated discovery.

**Requirement:** REQ-004, REQ-005, REQ-009, REQ-048, REQ-050

**Acceptance Criteria:**

- [x] (TEST) `jobs add <url>` detects known ATS URLs, handles LinkedIn as no-fetch, prompts for missing title/company, and persists a candidate.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- add-command.test.ts`
- [x] (TEST) Manual additions create source-listing records and can mark a pasted source as reusable.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- add-command.test.ts`
- [x] (TEST) LinkedIn add tests prove the command never attempts authenticated LinkedIn scraping.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- add-command.test.ts`
- [x] (TYPE) Add command implementation typechecks.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `apps/cli/src/commands/add.ts` - manual URL ingestion command.
- `apps/cli/src/commands/add-command.test.ts` - add command tests.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register add command implementation.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - `jobs add`.

**Dependencies:**

- Task 3.1.A and Task 3.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs add <url>`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 3.2.C: Implement Source Management Commands

**Description:**
Implement `jobs sources` subcommands for adding, listing, and testing reusable sources. ATS URL classification depends on the ATS adapter work from Task 3.1.B.

**Requirement:** REQ-005, REQ-006, REQ-007, REQ-048, REQ-050

**Acceptance Criteria:**

- [x] (TEST) `jobs sources add <url>` creates reusable ATS sources for Ashby, Greenhouse, and Lever and one-off manual sources for unknown URLs.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- sources-command.test.ts`
- [x] (TEST) `jobs sources test <id>` returns adapter test status and preserves source error details.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- sources-command.test.ts`
- [x] (TEST) `jobs sources list` distinguishes enabled, disabled, reusable, and one-off sources.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- sources-command.test.ts`
- [x] (TYPE) Source command implementation typechecks.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `apps/cli/src/commands/sources.ts` - source management commands.
- `apps/cli/src/commands/sources-command.test.ts` - source command tests.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register source command implementation.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - `jobs sources`.

**Dependencies:**

- Task 3.1.A, Task 3.1.B, and Task 3.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs sources`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 3.2.D: Implement Config Command

**Description:**
Implement `jobs config` prompt-based editing for provider settings, limits, cooldown, and local preferences. This task is intentionally separate from source ingestion so config behavior can be tested independently.

**Requirement:** REQ-061, REQ-062

**Acceptance Criteria:**

- [x] (TEST) `jobs config` prompt tests edit provider, credential env var, review limit, fetch limit, cooldown, and preferences.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- config-command.test.ts`
- [x] (TEST) Config command tests validate `hard_filter`, `soft_rank`, and `note_only` preference modes.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- config-command.test.ts`
- [x] (TEST) Config command tests reject invalid config before writing to `data/config.json`.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- config-command.test.ts`
- [x] (TYPE) Config command implementation typechecks.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `apps/cli/src/commands/config.ts` - config command.
- `apps/cli/src/commands/config-command.test.ts` - config command tests.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register config command implementation.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - `jobs config`.

**Dependencies:**

- Task 1.2.C and Task 3.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs config`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Phase 3 Checkpoint

**Automated Checks:**

- [x] (TEST) Unit and CLI integration tests pass.
  - Verify: `cd ../.. && pnpm test`
- [x] (TYPE) Type checking passes.
  - Verify: `cd ../.. && pnpm typecheck`
- [x] (BUILD) Build passes.
  - Verify: `cd ../.. && pnpm build`

**Regression Verification:**

- [x] (TEST) Source failure tests pass without live API credentials.
  - Verify: `cd ../.. && unset JOOBLE_API_KEY && pnpm --filter @ai-builder-jobs/core test -- source-failures.test.ts`
- [x] (TEST) CLI discover works against mocked sources in a temp data directory.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- discover-command.test.ts`

---

## Phase 4: Interactive Review And Job Management

**Goal:** Add the rich review loop, lifecycle transitions, interrupted-session durability, local list/show/search/archive commands, refresh behavior, and metadata-only export.
**Depends On:** Phase 3

### Pre-Phase Setup

Human must complete before starting:

- [x] Phase 3 verification passes.
  - Verify: `cd ../.. && pnpm test && pnpm typecheck && pnpm build`

### Step 4.1: Interactive Review

**Depends On:** Phase 3

---

#### Task 4.1.A: Implement Rich Review Cards And Prompt Flow

**Description:**
Build the interactive review renderer and prompt flow for the top-ranked candidates. The review card must show metadata, source, score, signals, surfaced reason, link, and transient description content when fetched.

**Requirement:** REQ-013, REQ-014, REQ-015, REQ-017, REQ-028, REQ-029, REQ-055, REQ-057

**Acceptance Criteria:**

- [x] (CODE) Review renderer includes title, company, source, link, location/work type, compensation, posted date, score, signals, surfaced reason, and transient description.
  - Verify: `cd ../.. && rg -n "title|company|source|location|compensation|posted|score|signals|surfacedReason|transientDescription" apps/cli/src packages/core/src/review`
- [x] (TEST) Review card snapshot or string tests cover candidates with and without descriptions.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- review-card.test.ts`
- [x] (TEST) Prompt flow tests support labels `yes`, `maybe`, `no`, skip, and optional structured notes.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- review-flow.test.ts`
- [x] (TEST) Review tests prove full descriptions are not persisted after rendering.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- review-flow.test.ts`
- [x] (TYPE) Review command code typechecks.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/review/reviewQueue.ts` - review queue state.
- `apps/cli/src/review/renderReviewCard.ts` - terminal review card renderer.
- `apps/cli/src/review/reviewPrompts.ts` - Inquirer prompt wrappers.
- `apps/cli/src/review/review-card.test.ts` - renderer tests.
- `apps/cli/src/review/review-flow.test.ts` - prompt flow tests.

**Files to Modify:**

- `apps/cli/src/commands/discover.ts` - start interactive review unless `--interactive=false`.

**Existing Code to Reference:**

- `PRODUCT_SPEC.md` - Flow 1.
- `TECHNICAL_SPEC.md` - Description Handling and CLI Contracts.

**Dependencies:**

- Task 3.2.A and Task 2.1.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs discover`, Description Handling

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 4.1.B: Persist Review Labels, Lifecycle Transitions, History, And Interruptions

**Description:**
Implement the review write path that converts labels into lifecycle state, preserves event history, saves active/maybe/rejected records, and survives Ctrl-C after completed labels have been written.

**Requirement:** REQ-017, REQ-018, REQ-019, REQ-020, REQ-021, REQ-022, REQ-023, REQ-024, REQ-025, REQ-041, REQ-042

**Acceptance Criteria:**

- [x] (TEST) Label transition tests map `yes` to active, `maybe` to maybe, and `no` to rejected while preserving separate review label and lifecycle status fields.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- lifecycle.test.ts`
- [x] (TEST) Review persistence tests write `job.reviewed` events and preserve prior label/status history.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- review-persistence.test.ts`
- [x] (TEST) Rejected jobs are hidden from normal list inputs but remain findable through explicit filters.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- lifecycle.test.ts`
- [x] (TEST) Interrupted review tests persist completed review events, write `session.interrupted`, and leave unreviewed candidates as `candidate`.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- interrupted-review.test.ts`
- [x] (TYPE) Review persistence services typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/review/lifecycle.ts` - label to lifecycle transitions.
- `packages/core/src/review/reviewPersistence.ts` - review write path.
- `packages/core/src/review/lifecycle.test.ts` - lifecycle tests.
- `packages/core/src/review/review-persistence.test.ts` - persistence tests.
- `apps/cli/src/review/interrupted-review.test.ts` - Ctrl-C handling tests.

**Files to Modify:**

- `apps/cli/src/review/reviewPrompts.ts` - interruption handling.
- `apps/cli/src/commands/discover.ts` - persist review outcomes.

**Existing Code to Reference:**

- `PRODUCT_SPEC.md` - Flow 7 and Label, Status, And Identity Semantics.
- `TECHNICAL_SPEC.md` - Interrupted Review and Event Log.

**Dependencies:**

- Task 4.1.A and Task 1.2.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - Interrupted Review, Event Log

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Step 4.2: Job Management Commands

**Depends On:** Step 4.1

---

#### Task 4.2.A: Implement List And Show Commands

**Description:**
Add the read-only local management commands that make saved jobs inspectable after discovery. This task covers the normal active-opportunity list and the detailed record view.

**Requirement:** REQ-019, REQ-021, REQ-025, REQ-056, REQ-057

**Acceptance Criteria:**

- [x] (TEST) `jobs list` defaults to active jobs and supports status, rejected, archived, and sort filters.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- list-command.test.ts`
- [x] (TEST) `jobs show <id>` displays job metadata, source listings, score/signals, review history, events, linked proposals, and do-not-merge decisions.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- show-command.test.ts`
- [x] (TEST) List tests prove rejected and archived jobs are hidden by default but included with explicit filters.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- list-command.test.ts`
- [x] (TYPE) List and show command implementations typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `apps/cli/src/commands/list.ts` - list command.
- `apps/cli/src/commands/show.ts` - show command.
- `apps/cli/src/commands/list-command.test.ts` - list tests.
- `apps/cli/src/commands/show-command.test.ts` - show tests.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register list and show commands.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - `jobs list`, `jobs show`.

**Dependencies:**

- Task 4.1.B and Task 2.2.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs list`, `jobs show`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 4.2.B: Implement Search And Archive Commands

**Description:**
Add local search and archive commands. Search must work without full description storage, and archived jobs must remain available for future trend analysis.

**Requirement:** REQ-021, REQ-026, REQ-027, REQ-029, REQ-056

**Acceptance Criteria:**

- [x] (TEST) `jobs search <query>` searches metadata, company, title, source names, notes, and signal labels without full description storage.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- search-command.test.ts`
- [x] (TEST) `jobs archive <id>` records archive reason, lifecycle status, archive event, and keeps archived jobs searchable.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- archive-command.test.ts`
- [x] (TEST) Archive tests prove archived jobs are excluded from normal list output and included with explicit archive filters.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- archive-command.test.ts`
- [x] (TYPE) Search and archive command implementations typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `apps/cli/src/commands/search.ts` - search command.
- `apps/cli/src/commands/archive.ts` - archive command.
- `apps/cli/src/commands/search-command.test.ts` - search tests.
- `apps/cli/src/commands/archive-command.test.ts` - archive tests.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register search and archive commands.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - `jobs search`, `jobs archive`.

**Dependencies:**

- Task 4.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs search`, `jobs archive`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 4.2.C: Implement Review Maybe And Dedupe Commands

**Description:**
Add focused commands for revisiting maybe jobs and creating do-not-merge decisions. These workflows mutate state, so they are separated from read-only list/show/search commands.

**Requirement:** REQ-019, REQ-025, REQ-029, REQ-053, REQ-056

**Acceptance Criteria:**

- [x] (TEST) `jobs review maybe` lets the user relabel maybe jobs as `yes`, `no`, or keep `maybe` while preserving label history.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- review-maybe-and-dedupe.test.ts`
- [x] (TEST) `jobs dedupe mark-do-not-merge <jobIdA> <jobIdB>` creates an order-independent do-not-merge record.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- review-maybe-and-dedupe.test.ts`
- [x] (TEST) `jobs dedupe list <jobId>` displays do-not-merge decisions involving that job.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- review-maybe-and-dedupe.test.ts`
- [x] (TYPE) Review maybe and dedupe command implementations typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `apps/cli/src/commands/reviewMaybe.ts` - maybe review command.
- `apps/cli/src/commands/dedupe.ts` - do-not-merge commands.
- `apps/cli/src/commands/review-maybe-and-dedupe.test.ts` - maybe/dedupe tests.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register maybe review and dedupe commands.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - `jobs review maybe`, `jobs dedupe`.

**Dependencies:**

- Task 4.1.B and Task 2.2.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs review maybe`, `jobs dedupe`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 4.2.D: Implement Refresh Command

**Description:**
Add refresh behavior for saved source listings. Refresh must update listing visibility and errors without deleting local jobs.

**Requirement:** REQ-027, REQ-039, REQ-063

**Acceptance Criteria:**

- [x] (TEST) Refresh service marks source listings as `ok`, `unavailable`, `rate_limited`, or `error` without deleting local jobs.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- refresh.test.ts`
- [x] (TEST) `jobs refresh` CLI integration test writes `job.refreshed` events and reports per-listing status.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- refresh-command.test.ts`
- [x] (TEST) Refresh tests preserve source error state and partial metadata on failed refresh.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- refresh.test.ts`
- [x] (TYPE) Refresh service and command typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/refresh/refreshService.ts` - refresh source listings.
- `packages/core/src/refresh/refresh.test.ts` - refresh tests.
- `apps/cli/src/commands/refresh.ts` - refresh command.
- `apps/cli/src/commands/refresh-command.test.ts` - refresh CLI tests.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register refresh command.
- `packages/core/src/index.ts` - export refresh APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - `jobs refresh`.

**Dependencies:**

- Task 3.1.A, Task 3.1.B, Task 3.1.C, and Task 4.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs refresh`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 4.2.E: Implement Metadata-Only Export Command

**Description:**
Add an export command that future public board work can consume. Export must include useful curated metadata while excluding full descriptions and secrets.

**Requirement:** REQ-027, REQ-039, REQ-052, REQ-060

**Acceptance Criteria:**

- [x] (TEST) Export tests write curated metadata to `data/exports/{timestamp}.json`.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- export.test.ts`
- [x] (TEST) Export tests prove full descriptions, API keys, and private env values are absent from exported JSON.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- export.test.ts`
- [x] (TEST) Export tests include active, maybe, archived, source, score, signal, and link metadata needed by a future public board.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- export.test.ts`
- [x] (TYPE) Export service and command typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/export/exportService.ts` - metadata export.
- `packages/core/src/export/export.test.ts` - export tests.
- `apps/cli/src/commands/export.ts` - export command.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register export command.
- `packages/core/src/index.ts` - export metadata export APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - `jobs export`.

**Dependencies:**

- Task 4.2.A and Task 4.2.D.

**Spec Reference:** `TECHNICAL_SPEC.md` - `jobs export`

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Phase 4 Checkpoint

**Automated Checks:**

- [x] (TEST) Unit and CLI integration tests pass.
  - Verify: `cd ../.. && pnpm test`
- [x] (TYPE) Type checking passes.
  - Verify: `cd ../.. && pnpm typecheck`
- [x] (BUILD) Build passes.
  - Verify: `cd ../.. && pnpm build`

**Regression Verification:**

- [x] (TEST) Review, lifecycle, archive, refresh, and export tests pass together.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- review-flow.test.ts list-command.test.ts archive-command.test.ts refresh-command.test.ts`
- [x] (TEST) Export remains metadata-only.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- export.test.ts no-description-persistence.test.ts`

---

## Phase 5: Learning, Export, And Hardening

**Goal:** Complete the feedback loop with session learning, proposal approval, evaluation metrics, end-to-end tests, documentation, and verification config for future execution.
**Depends On:** Phase 4

### Pre-Phase Setup

Human must complete before starting:

- [x] Phase 4 verification passes.
  - Verify: `cd ../.. && pnpm test && pnpm typecheck && pnpm build`

### Step 5.1: Feedback Loop

**Depends On:** Phase 4

---

#### Task 5.1.A: Implement Session Learning Adjustments And Evaluation Metrics

**Description:**
Add session-scoped learning adjustments, reversible within-session ranking changes, and per-session metrics. The CLI should learn enough during a session to re-rank remaining candidates without making durable logic changes automatically.

**Requirement:** REQ-030, REQ-031, REQ-034, REQ-057, REQ-064

**Acceptance Criteria:**

- [ ] (TEST) Session learning tests apply penalties for repeated negative signals and boosts for repeated positive signals within a session.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- session-learning.test.ts`
- [ ] (TEST) Session adjustments are written as `scoring.session_adjusted` events and stored in the active session record.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- session-learning.test.ts`
- [ ] (TEST) Reversal tests restore pre-adjustment ranking state within the current session.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- session-learning.test.ts`
- [ ] (TEST) Metrics tests track fetched count, unique count, reviewed count, yes/maybe/no counts, precision@10, and source-level acceptance rates.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- evaluation-metrics.test.ts`
- [ ] (TYPE) Learning and metrics services typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/learning/sessionLearning.ts` - session adjustment rules.
- `packages/core/src/learning/evaluationMetrics.ts` - metrics calculation.
- `packages/core/src/learning/session-learning.test.ts` - learning tests.
- `packages/core/src/learning/evaluation-metrics.test.ts` - metrics tests.

**Files to Modify:**

- `packages/core/src/discovery/discoverService.ts` - re-rank remaining candidates with session adjustments.
- `packages/core/src/review/reviewPersistence.ts` - emit learning events after review labels.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Session Learning and Evaluation Metrics.

**Dependencies:**

- Task 4.1.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - Session Learning

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 5.1.B: Implement Proposal Queue Approval And Application

**Description:**
Add proposal creation, listing, approval, rejection, deferral, and application for durable logic changes. Proposal application must be human-approved through the CLI command before it updates config, source, query, preference, or scoring-rules files.

**Requirement:** REQ-032, REQ-033, REQ-051, REQ-057

**Acceptance Criteria:**

- [ ] (TEST) Proposal service tests create pending proposals with targets, evidence, proposed changes, and scoring version metadata when applicable.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- proposals.test.ts`
- [ ] (TEST) Approval tests update the correct config, source, query, preference, or scoring-rules file and write `proposal.approved` plus `proposal.applied` events.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- proposals.test.ts`
- [ ] (TEST) Rejected and deferred proposals remain inspectable and do not apply proposed changes.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/core test -- proposals.test.ts`
- [ ] (TEST) `jobs proposals` CLI tests cover list, show, approve, reject, and defer.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- proposals-command.test.ts`
- [ ] (TYPE) Proposal services and commands typecheck.
  - Verify: `cd ../.. && pnpm typecheck`

**Files to Create:**

- `packages/core/src/proposals/proposalService.ts` - proposal lifecycle.
- `packages/core/src/proposals/proposals.test.ts` - proposal tests.
- `apps/cli/src/commands/proposals.ts` - proposals command.
- `apps/cli/src/commands/proposals-command.test.ts` - proposals CLI tests.

**Files to Modify:**

- `apps/cli/src/commands/index.ts` - register proposals command.
- `packages/core/src/index.ts` - export proposal APIs.

**Existing Code to Reference:**

- `TECHNICAL_SPEC.md` - Proposal Queue.

**Dependencies:**

- Task 5.1.A and Task 1.2.B.

**Spec Reference:** `TECHNICAL_SPEC.md` - Proposal Queue

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Step 5.2: End-To-End Quality And Documentation

**Depends On:** Step 5.1

---

#### Task 5.2.A: Add End-To-End CLI Fixture Tests

**Description:**
Create end-to-end tests that run the CLI through realistic local workflows using temp data directories and mocked sources. This verifies that the separate services compose into the user's intended daily job discovery workflow.

**Requirement:** REQ-002, REQ-003, REQ-004, REQ-013, REQ-017, REQ-018, REQ-019, REQ-020, REQ-026, REQ-032, REQ-040, REQ-042, REQ-063, REQ-064

**Acceptance Criteria:**

- [ ] (TEST) End-to-end tests cover discover, review labels, list, show, maybe review, archive, proposals, refresh, and export in a temp data directory.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- e2e-cli.test.ts`
- [ ] (TEST) End-to-end tests prove interrupted review preserves completed labels and exits cleanly.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- e2e-cli.test.ts`
- [ ] (TEST) End-to-end tests prove no-new-candidate sessions exit successfully.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- e2e-cli.test.ts`
- [ ] (TEST) End-to-end tests prove exported JSON contains active and archived metadata but no full descriptions or secrets.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- e2e-cli.test.ts`
- [ ] (BUILD) Full package build still succeeds after integration coverage is added.
  - Verify: `cd ../.. && pnpm build`

**Files to Create:**

- `apps/cli/src/e2e/e2e-cli.test.ts` - end-to-end CLI workflow tests.
- `apps/cli/src/e2e/fixtures.ts` - reusable mocked source fixtures.
- `apps/cli/src/e2e/testDataDir.ts` - temp data directory helper.

**Files to Modify:**

- `apps/cli/package.json` - ensure e2e tests are included in test script.

**Existing Code to Reference:**

- `PRODUCT_SPEC.md` - User Flows.
- `TECHNICAL_SPEC.md` - Testing Strategy.

**Dependencies:**

- Task 5.1.B and all Phase 4 tasks.

**Spec Reference:** `TECHNICAL_SPEC.md` - Testing Strategy

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

#### Task 5.2.B: Add Project Documentation And Verification Config

**Description:**
Document local setup, environment variables, source behavior, data storage, and common commands. Add verification configuration so future agents can run the same test, typecheck, build, and optional live-source checks consistently.

**Requirement:** REQ-001, REQ-037, REQ-052, REQ-054, REQ-058, REQ-059, REQ-060

**Acceptance Criteria:**

- [ ] (CODE) README documents install, setup, `JOOBLE_API_KEY`, local data path, no-description storage policy, LinkedIn no-fetch behavior, and MVP commands.
  - Verify: `cd ../.. && for p in "JOOBLE_API_KEY" "data/" "LinkedIn" "no-fetch" "jobs discover" "jobs add" "jobs export"; do rg -q "$p" README.md || exit 1; done`
- [ ] (CODE) `.env.example` documents supported environment variables without secret values.
  - Verify: `cd ../.. && test -f .env.example && rg -q "JOOBLE_API_KEY=" .env.example && ! rg -n "=.+[A-Za-z0-9]{20,}" .env.example`
- [ ] (CODE) `.claude/verification-config.json` contains test, typecheck, and build commands.
  - Verify: `cd ../.. && test -f .claude/verification-config.json && node -e "const c=require('./.claude/verification-config.json'); if(!c.commands?.test||!c.commands?.typecheck||!c.commands?.build) process.exit(1)"`
- [ ] (TEST) Full automated verification passes from a clean install state after docs/config changes.
  - Verify: `cd ../.. && pnpm test && pnpm typecheck && pnpm build`
- [ ] (CODE) Deferred public board and advanced classifier scope remain out of the MVP docs except as future notes.
  - Verify: `cd ../.. && rg -n "public board|job_classifier|future" README.md DEFERRED.md features/job_classifier/INITIAL_NOTES.md`

**Files to Create:**

- `README.md` - setup and usage documentation.
- `.env.example` - environment variable template.
- `.claude/verification-config.json` - verification commands.

**Files to Modify:**

- None

**Existing Code to Reference:**

- `DEFERRED.md` - public board and classifier deferrals.
- `TECHNICAL_SPEC.md` - Security And Privacy and Verification Commands.

**Dependencies:**

- Task 5.2.A.

**Spec Reference:** `TECHNICAL_SPEC.md` - Security And Privacy, Testing Strategy

**Browser Verification:**

- Criteria IDs: None
- Notes: CLI-only task.

---

### Phase 5 Checkpoint

**Automated Checks:**

- [ ] (TEST) Full test suite passes.
  - Verify: `cd ../.. && pnpm test`
- [ ] (TYPE) Type checking passes.
  - Verify: `cd ../.. && pnpm typecheck`
- [ ] (BUILD) Build passes.
  - Verify: `cd ../.. && pnpm build`

**Regression Verification:**

- [ ] (TEST) End-to-end CLI workflow tests pass.
  - Verify: `cd ../.. && pnpm --filter @ai-builder-jobs/cli test -- e2e-cli.test.ts`
- [ ] (CODE) Runtime data remains local and inspectable.
  - Verify: `cd ../.. && rg -n "data/config.json|data/events.jsonl|data/jobs|data/source-listings|data/sources|data/proposals|data/sessions|data/exports" README.md plans/greenfield/TECHNICAL_SPEC.md`
- [ ] (CODE) Public board remains deferred and export path is preserved.
  - Verify: `cd ../.. && rg -n "Public Job Board|Public web app integration|jobs export" DEFERRED.md plans/greenfield/TECHNICAL_SPEC.md`

---

## Final Project Verification

- [ ] (TEST) All tests pass.
  - Verify: `cd ../.. && pnpm test`
- [ ] (TYPE) Type checking passes.
  - Verify: `cd ../.. && pnpm typecheck`
- [ ] (BUILD) Build passes.
  - Verify: `cd ../.. && pnpm build`
- [ ] (SECURITY) No obvious secret values are committed in tracked text files.
  - Verify: `cd ../.. && ! rg -n "(api[_-]?key|secret|token)\\s*[:=]\\s*['\\\"]?[A-Za-z0-9_\\-]{20,}" -g '!node_modules' -g '!pnpm-lock.yaml' .`
- [ ] (CODE) Requirement IDs REQ-001 through REQ-064 are referenced by plan tasks.
  - Verify: `cd ../.. && for n in $(seq -f "REQ-%03g" 1 64); do rg -q "$n" plans/greenfield/EXECUTION_PLAN.md || exit 1; done`
