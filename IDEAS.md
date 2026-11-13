# Ideas

This is a lightweight, non-binding backlog. It preserves useful product directions without creating a required planning process.

## Public job board

The user has chosen to build a focused board. Start with a small hand-checked collection rather than treating an arbitrary number of reviewed listings or a fully automated classifier as a prerequisite. The board can grow as the curation loop becomes more reliable.

The first version should link to employer postings and show the role's focus, why it qualifies, required prior engineering background, U.S. location/work arrangement, and last employer verification. Keep the primary view on product-focused roles; make operations, design, and engineering-led overlaps discoverable without mixing their qualification gates. Search and filters should serve these distinctions rather than mimic a general job search engine. The approved detail view may publish complete verified public employer descriptions when the source permits it, with attribution, canonical URL, sanitization, and freshness handling.

The current [technical implementation plan](apps/board/README.md#technical-implementation-plan) governs the agreed Vercel migration and ingestion/review work. Start with recency ordering. Personalized ranking and a separate search service remain future options.

Build on the existing curation/export path where it is trustworthy. Investigate source terms and expiration detection for each ingestion route; begin with employer links and short authored summaries. Automate freshness checks only where the source supports them and make uncertain status explicit.

## Classification quality

The current rules remain the inspectable baseline. The deeper research brief is in `features/job_classifier/INITIAL_NOTES.md` and should compare prompted classifiers, embeddings, active learning, and lightweight supervised models against a human-labeled evaluation set.

Classifier changes should remain explainable and user-approved. Candidate improvements can be proposed from review feedback, but should not silently rewrite scoring rules.

## Trends and workflow extensions

- Derive source yield, role trends, archive movement, and other reports from existing jobs and event history.
- Revisit application tracking, reminders, notes, and resume or cover-letter assistance only after the discovery and review workflow is strong.
- Consider reader accounts and multi-user personalization after the core public browsing and editorial workflow works.
- Public-board source versions and full descriptions are part of the agreed durable pipeline where permitted; existing CLI records and exports remain description-free until deliberately extended.
- Neon Postgres through Vercel Marketplace is the selected durable store. The preview foundation uses Neon Free; the legacy local CLI still uses JSON/JSONL. Admin review, durable workflows, production isolation, and launch readiness follow the foundation.

## Boundaries

- Do not scrape authenticated LinkedIn pages.
- Do not present unverified candidates as current, employer-confirmed roles on the board. A small credible initial set is enough to launch the first version.
- Do not automatically apply classifier proposals or make applications on the user's behalf.


## Discovery prototype follow-ups

- Continue discovering builder focuses beyond the observed product, operations, software engineering and design examples; test mixed-focus cases and how review filters should present them without burying the primary product-focused audience.
- Evaluate unseen candidates with the new `prototype` workflow, keeping all 44 reviewed examples separate from measured accuracy. Compare worthwhile new roles and review effort with the closest existing search tools.
- Trial a supplier that supports responsibility/reference-based retrieval (for example the researched Hirebase option), then resolve supplier results to employer feeds before claiming freshness. Broad Jooble snippets currently remain unverified.
- Expand location parsing beyond explicit U.S./overseas labels without treating ambiguous remote jobs as confirmed U.S. eligibility.
- Review qualifications extraction against real postings; extraction-only mode remains unclear, and the optional model needs a live credential-backed evaluation.

- Benchmark Decisions API against a stronger structured-output classifier on a frozen unseen builder-role set; calibrate auto-publish thresholds using precision and missed-positive measurements, keep focus vocabulary open, and score SWE gate independently. See research/fresh-review-2026-10-28.md.
- Extend location filters with explicit state/city records and employer hiring restrictions as inventory grows; add salary period/currency support only with clear source semantics.

- Represent multiple location-specific compensation bands and conflicting or alternative work arrangements without synthesizing pay ranges or guessing eligibility. This would unblock several otherwise approved historical roles; see research/review-history-import-2026-10-29.md.

- Add new-candidate assessment and its review queue, reusing the implemented maintenance editorial controls where appropriate. Improve Overjoy and Indeed Flex source adapters before relying on unattended freshness checks. Enable recurring execution only after verification and authorization.

- Evaluate broad discovery by source-specific, independently assessed incremental matches. Add configured web-search/semantic supplier coverage for bespoke platforms and newly created employers; refresh the pinned directory deliberately. Add model-backed assessment with exact employer evidence and source-version binding before new-candidate publication. Investigate cross-ATS duplicate aliases without merging distinct location postings by title.

- Configure and evaluate real model assessments before treating the discovery queue as ranked builder matches. Compare reference versions on frozen held-out source versions and report missed positives from negative audits; measure improvement before automatic publication. Retain lower-score and employer-diverse exploration. Add bounded full-text enrichment for metadata-only candidates without turning a storage cap into a fit decision.

- Luna trial follow-up: separate role-category fit from geographic eligibility in model output (Wrike was categorized as excluded for Estonia despite positive builder evidence); expand country hints, and keep evergreen/talent-pool availability separate from role fit. Reassess remaining v1 predictions with explicit AI-assisted-building and problem-ownership criteria before trusting priority lanes. Audit product-PM prototyping versus central personal building (Lab37 KitchenOS) and AI capability building versus AI used to build (SQUIRE). Initial trial results are diagnostic calibration, not an accuracy benchmark.

- Reviewed-role Luna regression (research/luna-reviewed-regression-2026-10-29-v3.md): recover positive recall without accepting traditional PM/director/support mandates. Diagnose and fix six exact-quote validation failures without weakening evidence fidelity. Keep uncertain decisions distinct from correct No judgments; the four new negatives all abstained. Alt produces contradictory AI summaries and fit reasons. Recover full historical descriptions for Medecision, Rivian, Vailent/Vinmar and Vanta if sources permit. No further labeling is required to diagnose this iteration.

- Classifier follow-up after quote/abstention fixes: Apollo remains a No and OpenArt a stretch against historical Yes labels; OpenArt also varies between prompt versions. Resolve source-version ambiguity or test decision stability before automatic publication. Use research/luna-classifier-fixes-2026-10-29.md for exact V5-full/V6-recovery provenance. Quote copying is replaced with source passage selection; do not weaken exact-source evidence or treat all uncertain labels as correct negatives.

- Fresh unseen test: fix country/location hints for Kochi/Kerala, Tallinn, Chile and Turkey before spending on further U.S. discovery. Keep geography separate from category fit, but do not let clearly foreign locations consume a U.S.-only retrieval sample. Review research/fresh-unseen-test-summary-2026-10-29.json after the F1–F8 judgments; inspect finance/marketing workflow roles for incidental-AI false positives without excluding new focus areas categorically.

- Criteria-only comparison: Luna/Sol share the Lab37 and Azul false positives; use explicit prototype-support versus central implementation distinctions. The Azul rejection reason is still unknown; do not invent a no-internship or no-IT rule. Separate semantic fit from the passage-ID output interface: Sol truncated several indexed responses but completed plain-text controls. See research/capability-baseline-comparison-2026-10-29.md. Do not infer a clean model ranking from mixed-format recovery scores.

- Independently execute the frozen builder-fit-v10 candidate before promoting it. In-thread policy review improved agreement from 30/33 to 32/33, with Apollo remaining a disagreement and all five full-text negative checks retained; this is authored review with known labels, not independent model performance. See research/builder-prompt-iteration-review-2026-10-29.md for versions, coverage, rejected changes and stopping rationale. Preserve source-pairing caveats and remove each target's own calibration example. The Codex CLI rejected the exact requested GPT-6.1 Sol model with ChatGPT auth, and conservative paid-API reservations nearly exhaust the $3.60 cap; neither route was silently substituted.

- Fresh v10 user review: all eleven definite T01–T12 labels matched (nine Yes, two No); T07 PlanetScale is Maybe because independent problem understanding is uncertain. Apollo was reaffirmed Yes: correct the over-weighting of missing explicit production-shipping language relative to a supported role-wide builder mandate. Preserve the frozen predictions and score this batch before incorporating its feedback into any next prompt. See research/v10-fresh-review-2026-10-29.md. Do not report the small selected batch as population accuracy or turn T07 into a definite No.

- v11 now encodes the supported role-wide builder mandate and problem-versus-technical-ownership distinction. The manual v11 worker, approved-candidate draft bridge and durable preview queue are now implemented and fixture-tested. Next: choose the operating model allowance, independently validate live v11 inference, then verify scheduled execution before enabling it. See research/automation-next-stage-2026-10-29.md. Existing model caps and launch/recurrence boundaries stay in force.

- Reduce conservative re-review churn by distinguishing material responsibilities/qualification changes from source HTML or metadata-only changes; preserve source-version safety. Expand bespoke-source discovery beyond manually verified BambooHR maintenance. Resolve interrupted billable requests explicitly before any retry.

- Employer application questions can provide additional geography evidence when the posting says only Remote. Preserve the distinction between U.S. work authorization questions and explicitly eligible remote locations; Alt remains a geography uncertainty in the fresh-draft preparation report.

- Review the frozen Luna v11 live predictions before prompt changes: OpenArt usable prototypes handed to engineering, Noodle engineering leadership, and OnePay design-to-code ownership are useful boundaries. Separate true vacancies from talent pools and enforce geography independently of category fit; no accuracy claim follows from 20 successful API completions.

- v11 live review: 6/9 agreement on the selected reviewed subset; false positive Noodle, false negatives OnePay and Medici. Preserve these as source-bound evaluation judgments. v12 candidate broadens internal-practice ownership and operational workflow implementation without requiring code; independently regress against earlier positives/negatives before promoting it. The nine new labels are development evidence for v12, not a fresh validation set for that revision.

- V12 regression completed: latest nine 9/9; exact-source set 21/24 with false-positive Azul IT Intern and OpenSesame Systems Administrator, plus unclear OnePay Platform Engineer. Clarify the distinction between accepted Medici operational workflow implementation and these prior IT-role rejections before promoting v12. Preserve original labels without inventing rejection rationales. Seven further disagreements use historical labels with unverified text pairing; current Legion explicitly mentions production PRs, unlike the original conversational rejection. See research/luna-v12-reviewed-regression-2026-10-29-report.md.

- Review-queue assessment coverage: on November 12, only 22 of 1,542 unreviewed, full-text Preview candidates had a model assessment. The assessment worker currently considers only candidates seen in the past day, leaving older unassessed captures behind unless their source is recollected. Design a bounded, source-freshness-aware backlog pass within the existing Luna allowance, then measure whether its model-positive yield improves the daily queue. Keep blind evaluation and lower-score audit sampling independent of model labels.
