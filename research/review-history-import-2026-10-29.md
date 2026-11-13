# Historical reviews reused for the preview

The database now retains 54 distinct reviewed postings: 34 approved, 18 rejected, two uncertain. Accepted operations and engineering blends remain approved. Alt, Exiger, SharkNinja and the C52 Faros correction are retained. The optional unreviewed batch is excluded. There are 120 provenance records because multiple artifacts preserve some of the same judgments; these are not independent ratings. No model predictions were imported as user decisions.

The import ran twice without changing counts. Rejected postings remain rejected individually, not as employer-wide exclusions. Historical full-description hashes were generally unavailable and were not invented. A stored design snapshot comparison does not prove the exact text the user originally reviewed.

## Current source checks

Of the 34 approvals, 30 were verified open, three remain unresolved (Medecision, Vailent/Vinmar, Rivian), and Vanta was absent from a successfully read employer feed. Feed absence is not proof of closure. The bounded run ledger records 35 direct HTTP attempts, including three manual follow-ups. Public browser/source checks supplemented those requests; the ledger is not a count of every research or browser request. No model API calls or recurring collection were used.

Twenty-four current approved roles now populate the protected preview, with complete sanitized employer text, canonical URLs, attribution and check times. Publication provenance ties each record to its historical approval, exact current check and source hash. A prepared version manifest prevents silently applying changed source text. The six previous sample IDs are retained where the posting identity matches. Unknown original publication dates remain unknown; verification dates do not masquerade as posting dates.

## Approvals held from the seed

| Role | Reason |
| --- | --- |
| Alaffia | NYC stated; onsite/hybrid arrangement not explicit |
| Alt | Remote stated; U.S. hiring eligibility not explicit |
| Apollo | Multiple location-specific pay bands need faithful representation |
| Faros C46 | Feed and description give conflicting office locations |
| Sekai C29 | Remote-first language does not define hiring eligibility |
| MangoApps | Seattle stated; work arrangement not explicit |
| Medecision, Vailent/Vinmar, Rivian | Current source evidence unresolved |
| Vanta | Exact posting absent from successful feed |

These holds do not reverse the user's approvals. Inferred display focus and reconciliation notes are identified as assistant work. Non-base pay, OTE, and hourly compensation do not enter annual base-salary filters. Generic company icons are used where a verified logo is unavailable.

## Verification and scope

Repository tests, typecheck and production build pass. Deployed API returns 24 published roles; unauthenticated private-history access redirects to login. Import and seed eligibility tests cover label preservation, URL identity, stale/failed checks and employer HTML sanitization. These historical examples support calibration; no classifier accuracy claim follows from this import.

Public launch, domain changes and scheduled collection remain disabled. This is a working protected preview with manually reconciled inventory, not a completed automatic maintenance or classification pipeline.

## Later user correction, October 29

The user withdrew the Figma Sales Operations Manager approval as a mistake. It is now rejected in the reference set and private history, with the earlier positive preserved as evidence. The listing was withdrawn from the protected board and removed from both seed manifests. Current counts: 33 approved, 19 rejected, two uncertain; 23 displayed jobs. This is a fit correction, not an employer closure. No additional exclusion rationale was supplied.
