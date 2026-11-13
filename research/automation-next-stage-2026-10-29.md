# From classifier development to unattended operation

Status checked against the repository on October 29, 2026. This plan does not enable schedules, spend money, change domains or launch the board.

**October 30 checkpoint:** This document preserves the October 29 pre-integration gap analysis. Several gaps below have since been implemented; it is not the current task-status list. Follow the [technical implementation plan and current checkpoint](../apps/board/README.md#technical-implementation-plan). The next milestone is the complete human-reviewed approval-to-publication and maintenance loop in protected preview. V12 regression is complete and current classification is sufficient for review assistance; further classifier tuning is not a prerequisite. The original Vercel/Neon architecture, Vercel Workflows validation, public metadata/indexing, production isolation, recovery and launch boundaries remain in scope.

## Prompt update completed

`builder-fit-v11` incorporates the user's Apollo reaffirmation and T07 PlanetScale uncertainty. It weighs a supported role-wide hybrid-builder mandate wherever it appears, without requiring literal production-coding wording. It separately requires evidence of understanding/framing user or business needs and helping choose what to build. Technical component ownership alone is insufficient; shared or scoped problem ownership can qualify, including for internal developers. Missing decisive evidence remains unclear, not a categorical rejection of engineering roles.

No company-specific acceptance rule or negative PlanetScale example was added. Earlier policies, frozen predictions and user labels are unchanged. The full prompt is in `builder-classification-prompt-v11-2026-10-29.md`; construction and response schema are in `apps/board/src/builder-prompt.ts`. v11 has not yet been independently exercised through an unattended model worker.

## Actual implementation gap

The existing pieces are substantial, but they do not form an unattended supply loop:

| Piece | Verified in code | Remaining connection |
| --- | --- | --- |
| Broad collection | ATS directory, public feed adapters, durable source/candidate versions, request limits and run records | Recoverable incremental execution and a deployed trigger |
| Classification | `scripts/assess-discovery.ts` calls the old `builder-feedback-v6` assessor; it has source-version checks and durable reservations | Use the selected v11 policy through the actual worker; preserve the admin result contract and source evidence |
| Model transport | Existing worker is Luna-only with its original $1 guard; the separate comparison runner used a larger cumulative authorization | Explicit unattended model/configuration and an approved operating allowance; no silent reset or widening of old caps |
| Human review | `/admin/discovery` records version-bound Yes/No/Maybe, with corrections and held-out separation | Import source-bound chat decisions and promote approved new candidates into validated board drafts |
| Publishing | Historical-job and maintenance editorial controls can reconcile display fields and publish protected-board records | New discovery candidates need publication provenance and draft/approval handling; saving a Yes currently does not publish |
| Freshness | Manual rechecks, change holds, closure handling, retry/backoff state and seven-day stale withholding | Extend maintenance to newly discovered publications and run it on a schedule |
| Scheduling | `apps/board/vercel.json` has no crons; no Workflow SDK dependency is installed | Verify the execution layer manually in preview, then separately enable recurring execution |

In particular, publication provenance currently requires a historical review role/check, and maintenance joins through that history. New candidates cannot simply be marked published and assumed to participate in rechecks. The new-candidate path must supply compatible, auditable provenance or deliberately extend that schema and the maintenance query.

## Recommended next increment

Build one protected, manually triggered preview run:

**Collect employer feeds → normalize/deduplicate → assess new or changed source versions with v11 → stage drafts/review → approve → maintain.**

1. **Integrate the selected classifier.** Share the exact versioned policy between tests and the worker. Keep role fit separate from focus, SWE gate, geography and availability. Preserve short decision output, required UI fields, source-bound evidence and explicit failure handling. Verify the serialized production request instead of assuming an exported policy is the one being sent. Check the API execution path with a frozen regression before treating in-thread review agreement as unattended performance.
2. **Connect approved discovery to drafts and maintenance.** Import the nine fresh Yes decisions, two No decisions and T07 Maybe against their exact sources; retain evaluation provenance. Reconcile canonical URL, full description, focus, qualifications, salary semantics, cities/work arrangement and U.S. eligibility. Unknown pay can remain unknown; uncertain eligibility cannot be invented. New publications must enter the same refresh/change/closure lifecycle as historical publications. Preserve recency timestamps when records are refreshed or approved.
3. **Make execution recoverable.** Refactor existing CLI loops into bounded worker steps. Retain run IDs, checkpoints, source hashes, prompt/model versions, locks, attempt records and spending reservations. Duplicate triggers must not duplicate drafts or billable calls. A source change during assessment invalidates its result. Retry transient feed failures with bounds; reconcile ambiguous model attempts before resending, since a timeout can still incur usage.
4. **Prove operational behavior in preview.** Run the same batch twice, interrupt/resume, simulate a source timeout, change a description during assessment, exceed a budget, and close a previously published fixture. Verify admin visibility, draft approval and subsequent maintenance. These are operational tests; they do not require another round of user job labeling. Stub model responses until billable requests have headroom under an approved cap.
5. **Enable scheduling after verification.** Keep the broad employer registry. Check useful employers regularly and rotate broader discovery; classify new/changed content rather than paying to reclassify the whole pool every day. Start with daily collection/maintenance and bounded assessment. Provide run health, last successful collection, deferred work, failed sources, spending and actionable failure alerts. Keep new-role publication human-approved initially; automatic publication is a separate later decision.

The next implementation milestone is a working preview run from ingestion through a maintained approved listing, with the scheduler still disabled. Public launch and domain changes remain separate approval boundaries.

## Hosting and execution choices

The existing Vercel/Neon direction still fits. Vercel [Workflows](https://vercel.com/docs/workflows) supports durable steps and recovery across crashes; validate a bounded slice before adding its SDK throughout the app. Its usage allowances/cost must be checked before creating paid usage or adding a subscription. No dependency or service was added in this task.

Vercel [Cron](https://vercel.com/docs/cron-jobs) invokes production deployment endpoints, so preview verification should use protected manual invocation. Cron is only the trigger: Vercel documents [no automatic retry of failed cron invocations, possible overlaps and duplicate/missed delivery](https://vercel.com/docs/cron-jobs/manage-cron-jobs). The worker must provide recovery and idempotency. [Hobby scheduling](https://vercel.com/docs/cron-jobs/usage-and-pricing) supports daily jobs; more frequent scheduling depends on the account plan. No plan upgrade is needed merely to plan a daily cadence.

For the proposed Vercel-hosted classifier, use an explicitly configured model API worker with its own approved limit. Testing inside this conversation does not create that deployed service. OpenAI distinguishes [ChatGPT subscription access from API-key usage-based access](https://developers.openai.com/codex/auth); general model API calls use Platform keys. The local CLI previously rejected the exact GPT-6.1 Sol model under its ChatGPT login, so there is no verified subscription-backed unattended runner to substitute. The old experiment's conservative reservations are nearly exhausted; establish an operating allowance before additional paid calls. This is not a request to authorize spending now.

## Completion checks for this next stage

- The worker actually sends v11 and records its exact prompt/model/source versions.
- Repeated or resumed runs neither duplicate records nor silently bypass model spending limits.
- Human labels remain authoritative for their source versions; uncertainty and stale versions remain explicit.
- Approved new candidates become correctly attributed, filterable drafts and can be published on the protected preview through editorial controls.
- Those new publications are refreshed, held on material change, and closed only on reliable employer evidence.
- Failures and deferred work are visible; seven-day hiding is never reported as successful refreshing.
- Scheduled execution, public launch and automatic new-role publication remain disabled until their respective verification/authorization steps.

## Implementation follow-up

Steps 1–3 are implemented in the manual preview pipeline. The worker sends v11, current human Yes judgments stage hidden drafts into existing publication provenance, and collection/assessment/staging/maintenance use durable, bounded jobs. Nine fresh approved roles were staged; none were published. Twelve judgments remain source-bound evaluation labels. Eleven isolated database integration checks passed with fixture responses and zero external model calls; see `preview-pipeline-verification-2026-10-29.json`. Earlier tables describe the pre-integration audit. Live model quality, scheduled invocation and public launch are separate outstanding validations.
