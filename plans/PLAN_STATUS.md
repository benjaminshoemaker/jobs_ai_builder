# Plan Status

Primary active workstream: `plans/greenfield/`
Current type: `greenfield`
Current stage: `execution-plan`
Current status: `active`
Last updated: 2026-05-12
Updated by: /generate-plan

Rule: This manifest orients agents to active and planned work; it is not a
single-plan execution lock. Agents may implement any non-archived workstream
that is explicitly requested by the human. Archived, rejected, abandoned,
superseded, completed, and research-only plans remain context only unless the
human explicitly revives them.

## Current Scope

- What is being built: A TypeScript/pnpm CLI-first AI Builder job discovery tool with local JSON/JSONL storage, rules-based scoring, API/ATS source adapters, review-time feedback, and auditable learning data before any public board is built.
- Source docs: `plans/greenfield/DISCOVERY_NOTES.md`, `plans/greenfield/PRODUCT_SPEC.md`, `plans/greenfield/TECHNICAL_SPEC.md`, `plans/greenfield/EXECUTION_PLAN.md`
- Next command: `cd plans/greenfield && /fresh-start`

## History

| Path | Type | Status | Superseded By | Updated | Notes |
|------|------|--------|---------------|---------|-------|
| `plans/greenfield/` | greenfield | active |  | 2026-05-12 | Execution plan for TypeScript CLI-first AI Builder job sourcing and feedback loop |
| `features/job_classifier/` | feature | planned |  | 2026-05-12 | Future classifier research beyond the rules-based MVP |
