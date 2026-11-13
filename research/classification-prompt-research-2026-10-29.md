# Builder classifier: prompt research and iteration

Research date: October 29, 2026. Candidate: builder-fit-v8. This is a development candidate, not a production scorer replacement.

Follow-up: subsequent in-thread development selected [builder-fit-v10](builder-prompt-iteration-review-2026-10-29.md). The research and API test results below preserve the original v7/v8 work; later authored review results are not additional independent model runs.

## Conclusion

Repeatedly revising a prompt against existing human labels is the right development process. Overfitting is a reason to maintain a separate generalization check, not a reason to avoid optimizing the prompt. Previously inspected jobs remain valuable development data. No additional user labeling is needed before using that data more systematically.

The earlier zero-shot comparison tested whether the written definition alone conveyed the boundary. A production classifier can and should use representative labeled examples where they improve measured performance. A stronger model cannot be expected to infer a private inclusion boundary that the supplied policy describes differently.

## Current primary-source guidance

- OpenAI's current [prompt engineering guide](https://developers.openai.com/api/docs/guides/prompt-engineering) recommends explicit instructions, separating instructions from input, representative few-shot examples, pinned configurations and evals. For this task, a small set of contrasting labels can explain what “builder” means more effectively than accumulating exceptions.
- OpenAI's [evaluation best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices) support task-specific examples, human judgments and repeated comparisons. Development-set gains and unseen performance are different claims. Its hosted Evals product is retiring; this project uses its own local runner rather than adding a dependency on that service.
- The official [OpenAI changelog](https://developers.openai.com/api/docs/changelog) dates GPT-6 Luna/Sol to September 22 and GPT-6.1 Sol to September 29, 2026. These are recent model releases, but release recency does not remove the need to test this category's policy and interface.
- Anthropic's September 22 [Opus 5.5 release](https://www.anthropic.com/claude-opus-5-5) and current [Opus prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-5-5) reinforce measuring effort settings on the actual task. Its [Sonnet 5.5 guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-sonnet-5-5) specifically discusses interactions between reasoning and structured output. That is model-specific guidance, not proof of the cause of our OpenAI truncations. We should test output format and policy separately.
- [DSPy's GEPA tutorial](https://github.com/stanfordnlp/dspy/blob/main/docs/docs/getting-started/gepa-optimization.md) describes automated prompt optimization using example-level feedback and evaluation. This is the same basic propose–test–inspect–revise loop the user suggested. No optimizer framework was installed; a small explicit runner is sufficient at this stage.

These sources do not identify a universal frontier-model prompt that guarantees 99% accuracy. Their useful common recommendation is to optimize the actual task, with representative examples and controlled evaluation. General reasoning guidance from older models is background, not evidence of a new September/October technique.

## Rewrite

The full [v8 prompt](builder-classification-prompt-v8-2026-10-29.md) includes a coherent policy plus seven anonymized calibration vignettes. The [plain policy](builder-classification-policy-v8-2026-10-29.txt) is separately inspectable. Executable construction lives in `apps/board/src/builder-prompt.ts`.

The policy distinguishes a central personal implementation mandate from PM concept prototyping, and responsibility for a useful result from participating in assigned tasks. It retains junior builders, engineering collaboration, demanding SWE qualifications and open focus areas. AI must enable the person's building; an AI product or AI-tool experience alone is insufficient. Fit is separate from geography, pay and background requirements.

Examples cover Overjoy, Lab37, AwardSpring, Azul, TRM, SQUIRE and Rillet. They are authored abstractions of the calibration cases, not employer quotations. Provenance remains outside the model's job input. The target employer's own example is removed during evaluation. This avoids directly supplying the answer to its own test, but does not turn already studied cases into unseen tests.

The user supplied no reason for Azul's rejection. The ownership distinction is our proposed operational interpretation of the labels, not a quotation or a newly established categorical ban on IT/support/internships. It needs regression testing against the other approvals.

The response is only `decision` and a short decisive reason. This separates semantic fit testing from the older passage-ID/evidence machinery. A production implementation must retain source-bound evidence and freshness; this candidate does not silently weaken or replace those controls.

## Actual development checks

Model: Luna, medium reasoning, full frozen postings, small JSON response, no automatic retries. These cases were already inspected; results are development diagnostics.

| Version | Cases checked | Matched recorded labels | Disagreements |
| --- | --- | --- | --- |
| v7 | Lab37, Azul, SQUIRE, Overjoy, AwardSpring, TRM | 4/6 | Azul and SQUIRE accepted |
| v8 | Azul, SQUIRE, Overjoy, AwardSpring | 4/4 | None in this targeted check |

All requests completed. The v8 check preserved two positives while correcting two negatives, with the target's own calibration example excluded. It is not a full regression, an independent benchmark, or proof of 100% precision/recall on new jobs. Lab37 and TRM have not been rerun under v8. Historical positive source-text/label pairing caveats remain; the JSON reports separate those development expectations from source-verified scoring. The source-verified subset here contains only negatives, so it cannot establish recall.

Artifacts: [v7 results](builder-prompt-v7-smoke-2026-10-29.json), [v8 results](builder-prompt-v8-smoke-2026-10-29.json). Cumulative conservative API reservations are $3.597705025 of the approved $3.60 cap. Reported usage estimate is about $0.90004, not an invoice; failed/interrupted calls retain their reservations. No further calls are authorized by the tiny remaining reservation headroom.

## Repeatable next loop

1. Freeze all available reviewed full postings with source hashes and corrected labels. Preserve uncertain labels and missing historical text separately. Use all usable prior judgments as development data; a seven-example prompt library does not limit the evaluation corpus to seven jobs.
2. Freeze the model, effort, output format, prompt version and example-selection policy. Remove the target's own employer/example from its evaluation request.
3. Run the whole development suite after each substantive change, including previously passing positives and negatives. Targeted checks diagnose a failure cheaply; they do not replace full regression.
4. Report true/false positives and negatives, precision, positive recall, abstention rate and operational failures. End-to-end recall includes positive abstentions and failed calls as missed acceptances; do not improve apparent quality by hiding them. Keep source-unverified historical expectations visibly separate.
5. Inspect errors and change the smallest general rule or representative example that explains them. Preserve every version and result. Do not add company-name rules or one-off exclusions to fit the answer key.
6. When development results are acceptable, freeze the candidate and test untouched or genuinely fresh labeled cases. Once those cases influence revisions, treat them as development data and obtain a separate subsequent check. Report sample size and uncertainty before claims about 99% performance or automatic publication.

The full v8 regression is the next model experiment, subject to the existing budget boundary. Production scoring, publication and recurring collection are unchanged. No new dependency or subscription was introduced.
