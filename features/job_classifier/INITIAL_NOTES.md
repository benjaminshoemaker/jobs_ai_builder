# Job Classifier - Initial Notes

## Status

Planned future work. Do not include this in the rules-based MVP unless explicitly promoted.

## Why This Exists

The first version of AI Builder Jobs should use a simple rules-based classifier so the CLI can start finding and reviewing jobs quickly. The deeper job-classifier work should be a separate investigation because the right approach may involve active learning, human feedback, evaluation sets, prompt design, source-quality measurement, or a lightweight ML/LLM classifier.

## Goal

Design a well-researched approach for improving the job feed and classifier after the rules-based MVP produces real review data.

Use the [current working definition](../../INITIAL_NOTES.md#working-definition) and its user-reviewed examples as the classification target. Record builder focus with an open vocabulary; product, operations, software engineering and design are observed examples, not a fixed taxonomy. The primary search requires substantive product judgment, direct building, and AI as an enabler. Rillet is a user-confirmed operations-focused builder and Babylist is a design-focused one. Read qualifications first, then assess actual responsibilities: prioritize accessible product builders, retain genuine product blends requiring engineering experience as a distinct type, and flag implied engineering expectations as stretch or unclear. A forward-deployed title alone is not an exclusion: TRM is a positive because it builds directly for mission users and carries their needs into the product roadmap; earlier solutions-centered negatives remain specific to those postings. Exclude coordination-only work without central personal building. Focus, engineering-background requirements, and fit are separate dimensions. The current implementation has not been validated against this clarified boundary.

Use the complete positive, negative, and stretch reference set, including older judgments, rather than only the latest examples. Distinguish a central building mandate from AI-native PM work with supporting prototypes. Preserve the user's specific labels when surface signals conflict; retain uncertainty for other roles rather than deriving an unsupported universal rule.

The classifier should help answer:

- Is this a true AI Builder role?
- Is it a Product Engineer role that crosses the AI Builder boundary?
- Is it only AI-augmented, builder-adjacent, or generic startup/AI-company hiring?
- Why was this job surfaced?
- What feedback should change immediately versus become an aggregate proposal?

## Starting Hypothesis

MVP classification should be deterministic and inspectable:

- Positive keyword/signal matching.
- Negative keyword/signal matching.
- Source-quality weighting.
- Product discovery/build/agent signal scoring.
- Explicit exclusion rules for pure AI PM, ML engineer, DevRel, prompt/content, generic automation, and normal full-stack roles.
- Human labels: `yes`, `maybe`, `no`.
- Optional reason labels and notes.
- Audit logs for review-time scoring changes.

This should generate the first labeled dataset before adding model complexity.

## Research Questions

- What is the best technical approach after rules: prompt-only classifier, lightweight supervised classifier, embedding search, active learning, or a hybrid?
- How much labeled data is needed before model-based classification is worth trying?
- How should a small "golden set" be built from reviewed jobs?
- Which metrics matter most: precision@10, yes/maybe acceptance rate, novelty rate, false-positive categories, source yield, or review time?
- How should product-engineering boundary cases be represented in examples?
- How can the system avoid overfitting to the user's most recent feedback?
- What should trigger immediate review-time rule adjustment versus queued aggregate proposals?
- Can Karpathy-style `autoresearch` or similar research-agent workflows help compare classifier approaches and design experiments?
- Would Argilla, ASReview LAB, or another labeling/evaluation tool be useful, or is local JSON/JSONL enough?

## Candidate Approaches To Compare

### Rule-Based Baseline

Use explicit weighted signals and exclusions. This is the MVP path and the baseline every later classifier must beat.

### Prompted LLM Classifier

Use a structured prompt with examples and require JSON output with score, classification, positive signals, negative signals, and uncertainty. Useful before enough labeled data exists, but must be evaluated against human labels.

### Embedding Retrieval

Embed reviewed postings or extracted metadata/signals and compare new roles to known positive and negative examples. Useful for similarity and source discovery, but may be weak without full descriptions.

### Lightweight Supervised Model

Train a small classifier once there is enough labeled data. This may be premature until the review set is meaningful.

### Active Learning Loop

Prioritize candidates that are high-value or uncertain, so each user label improves the system more. ASReview LAB is an inspiration point for this pattern.

## Inputs Available From MVP

- Job title.
- Company.
- Source.
- Source URL.
- Location/work type.
- Salary/compensation if available.
- Posted/discovered dates.
- Transient description-derived signals.
- AI Builder score.
- Positive and negative signals.
- Review label.
- Optional reason labels and notes.
- Event history.
- Source error and source-yield data.

Full descriptions are not stored by default, so classifier designs must either work from metadata/signals or explicitly revisit that product decision.

## Output Expectations

When this workstream is promoted, produce:

- A research summary of classifier approaches.
- A recommended architecture.
- An evaluation plan.
- A minimum labeled-data threshold for moving beyond rules.
- A prompt/schema design if using an LLM classifier.
- A proposal format for classifier changes.
- A migration path from rules-based MVP to the chosen approach.
