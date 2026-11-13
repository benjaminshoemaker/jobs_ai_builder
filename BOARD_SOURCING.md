# Sourcing jobs for the builder board

The board is a curated collection, not a mirror of a general job database. Discovery sources suggest candidates; the employer posting decides what is current and what the role requires. Discovery should cover thousands of postings across hundreds of employer boards. The small published inventory reflects careful verification; it must not constrain the discovery pool.

The current [technical implementation plan](apps/board/README.md#technical-implementation-plan) defines the Vercel migration, durable ingestion/review records, reversible deduplication, structured remote eligibility, classification evaluation, and closure propagation. The initial public ordering is recency, newest first; verification or reclassification must not reset a posting's age.

## 1. Find candidates through several routes

| Route | What it is good for | How to use it |
| --- | --- | --- |
| Existing job search and category boards | Finding companies and titles not yet on our watchlist | Search HiringCafe and AI Native Builder manually for terms such as `product builder`, `AI-native PM`, `ship code`, `Claude Code`, `internal tools`, and `AI operations`. Treat results as leads, not facts to republish. |
| Public web search | Finding postings across inconsistent titles | Search for responsibilities, e.g. `"product manager" "ship code" "Claude Code" jobs`, `site:jobs.ashbyhq.com "build" "product" "Claude Code"`, and operations/design variants. Search results may be stale; resolve to employer pages. |
| Watched employer career boards | Detecting new roles from companies that have hired this profile | Maintain a broad employer registry, prioritize known productive sources, and check public postings, whether they use Ashby, Greenhouse, Lever, or an employer-specific careers site. This is reliable for known employers but cannot discover companies we have not added. |
| Inbound suggestions | Discovering roles our searches missed | Let employers and readers suggest a canonical job URL; review with the same criteria before showing it. |
| Broad jobs API, optionally | Increasing candidate reach when manual discovery is no longer enough | The current CLI supports Jooble with an API key. Its snippets and links are unverified leads; resolve each promising result to an employer posting. Do not make the board depend on a paid source until its incremental yield is measured. |

Do not bulk-copy another job board or scrape authenticated LinkedIn pages. [AI Native Builder's terms](https://www.ai-native-builder.com/terms) specifically prohibit scraping, crawling, or systematically downloading its listings without permission. Its [About page](https://www.ai-native-builder.com/about) and [employer inquiry page](https://www.ai-native-builder.com/post-a-job) say it curates jobs and accepts listing inquiries, but do not disclose its exact upstream feeds or refresh process. Use it for ordinary competitive research and candidate discovery, not as an automated bulk supplier. Investigate source terms before automating a new source.

## 2. Verify each candidate at the employer

For every candidate, confirm the canonical employer URL, current title, company, U.S. location or eligibility, work arrangement, required qualifications, and actual building mandate. Read qualifications first. Record whether prior professional software-engineering experience is required, merely accepted, or unclear. Classify the center of responsibility (product, operations, design, engineering-led overlap, or a new focus) separately. Keep a short evidence-based reason for inclusion and the verification timestamp.

For supported employer boards, the repository has public adapters:

- [Ashby public posting API](https://developers.ashbyhq.com/docs/public-job-posting-api): use the board's slug; include only `isListed: true` postings. The prototype collector enforces this. A direct URL alone can point to an unlisted posting.
- [Greenhouse Job Board API](https://docs.greenhouse.io/job-board): read the employer's public board and job ID. `updated_at` is an update time, not necessarily the original posting date.
- [Lever Postings API](https://github.com/lever/postings-api): read published company postings, then link to `hostedUrl` or `applyUrl` rather than building an application form.

Other systems, such as Workday, Comeet, and Rippling, can be checked manually at first. A failed request or inaccessible page means *status unknown*, not closed. If an employer feed omits a previously seen posting, hold it for review rather than displaying it as verified current.

Employer-specific career sites, including [Google Careers](https://www.google.com/about/careers/applications/jobs/results/) and [Microsoft Careers](https://careers.microsoft.com/v2/global/en/home.html), belong in the same watchlist. Discover candidates through their public search pages and web search restricted to their official domains, then verify each individual posting at the employer. Preserve its canonical URL and employer job ID when available. For repeat monitoring, prefer a documented public feed or structured job data if the site provides one; otherwise use a small site-specific check only after confirming its access rules and reliability. Do not assume these sites offer an Ashby-style public API. Search indexes and third-party snippets are discovery leads, not proof that a role remains open. Add dedicated automation for an employer when its relevant-role yield justifies maintenance.

## 3. Decide what appears on the board

Publish only roles with a current employer posting and enough evidence of problem judgment, central personal AI-assisted building, and delivery or meaningful testing. Keep the product-focused, non-engineering-gated roles prominent. Show other confirmed builders with their focus and experience gate. Hold ambiguous PM, SWE, solutions, or location cases for review; do not turn uncertainty into a positive label.

A public card needs: title, company, U.S. location/work arrangement, focus, engineering-experience gate, and actions to view details or apply on the company site. The authored reason for inclusion and last verification date appear in role details, with the date treated as a small footnote. Salary and seniority can be added when clearly stated by the employer. The on-board detail view should include the complete role information needed to assess fit: responsibilities, qualifications, compensation, benefits, workplace terms, and our editorial assessment. A verified public employer description may be stored and published in full when its source permits it. Keep its canonical employer URL, attribution, and last-checked time; sanitize source HTML and remove or update descriptions when postings change or close. Do not copy descriptions from other job boards. The existing CLI records and exports remain description-free until explicitly extended for the public board. Never store or export secrets.

## 4. Operate a manageable loop

Keep publication selective while running discovery broadly. Initial manual trials visit hundreds of employer boards; no arbitrary small candidate count defines success. Recurring collection stays disabled until verified and authorized. Review promising candidates, then recheck displayed roles at least weekly and before featuring them. Archive roles that the employer confirms are gone; mark failures or conflicting signals as uncertain. Measure where worthwhile new roles came from so the sourcing mix can improve.

The current experimental CLI can scan known employer boards without credentials:

```bash
pnpm build
pnpm jobs prototype scan --live --dry-run --board greenhouse:figma --board ashby:trm-labs --max-requests 2
pnpm jobs prototype scan --live --board greenhouse:figma --board ashby:trm-labs --max-requests 2 --limit 15
pnpm jobs prototype show
```

`prototype` is a qualifications-first research tool, not a publication pipeline. It writes local metadata and short evidence to `data/prototype/latest.json`; extraction-only cards remain unclear until reviewed. Optional broad Jooble queries require `JOOBLE_API_KEY` and `--live`, and count against the explicit request budget. The legacy `jobs export` path exports curated metadata but is based on older classification rules; reconcile it with the current definition before using it to publish the board.

## Reviewed inventory imported October 29, 2026

The protected preview now reuses the complete recorded review history: 54 decisions, originally including 34 positives; the later Figma Sales Operations correction leaves 33 approvals, 19 rejections and two uncertain cases. Twenty-four current approvals were reconciled and seeded; remaining positives retain explicit source or metadata holds. See [the import report](research/review-history-import-2026-10-29.md). Historical examples remain calibration data and must not be reported as unseen classifier accuracy.

## Broad discovery implementation and source choice (October 29, 2026)

Ashby and Greenhouse account for **25 of the 33 current historical approvals** (12 Ashby, 13 Greenhouse) and **43 of all 54 reviewed postings** (26 Ashby, 17 Greenhouse). This selected research sample supports prioritizing those integrations; it is not evidence of market share or provider-level classification precision. Other approved examples use Workable, Kula, Paylocity and bespoke employer pages, so ATS-only discovery cannot be complete.

| Source | Decision and practical limit |
| --- | --- |
| [Ashby posting API](https://developers.ashbyhq.com/docs/public-job-posting-api) | First-class collection lane. One board identifier retrieves published roles with descriptions, locations and optional compensation. Only `isListed: true` jobs are candidates; `publishedAt` is not treated as proof of original creation. It is not a global company search API. |
| [Greenhouse Job Board API](https://docs.greenhouse.io/job-board) | First-class collection lane. Public GET endpoints require no authentication; `content=true` includes descriptions. Exact posting IDs and board tokens support stable within-ATS identities. Custom URLs and multiple boards require care when deduplicating. |
| [Lever Postings API](https://github.com/lever/postings-api) | Exploratory lane to test incremental coverage, despite no original approved example coming from Lever. Read public postings only, respect rate limits, link to employer application pages. |
| [Open ATS Feed directory](https://github.com/veresk06/open-ats-feed) | Employer identifiers only, not a supply of descriptions or current availability. Pinned commit `01b3908c8a8fe13bb4117cd2b2f7e2c7d489a108`, dataset dated September 3, 2026. Imported 3,413 Ashby, 5,971 Greenhouse and 1,925 Lever identifiers before filtering unsafe/test/internal tokens and adding research-derived sources. Dataset age means every job still needs a fresh employer fetch. MIT attribution is retained beside the derived directory. |
| Public web search | Expands the registry and finds bespoke platforms, including Google and Microsoft. Use responsibility and AI-tool terms across product, operations, design and engineering; search snippets are leads only. The manual search in this pass found a Kettle PM/prototyping role and Google marketing-agent PM examples, but title/prototype language alone does not establish a match. Automated web search requires a separate configured provider; no web-search credential is currently configured. |
| [Hirebase](https://www.hirebase.org/pricing) | Strong optional supplier to test cross-employer/semantic retrieval. Current published Free allowance is 500 jobs/month; Starter is advertised at $99/month. Those allowances are vendor claims, not tested yield here. No account, subscription or API connection was added. |
| [Adzuna](https://developer.adzuna.com/overview), existing Jooble adapter, [Brave Search API](https://brave.com/search/api/) | Additional discovery options. They require credentials and a source-specific review of quotas, attribution and commercial use before integration. No keys are configured and no paid service was enabled. |

The private board collector uses `catalog/discovery-directory.json`, prior research URLs and reviewed employer sources. The initial 300-board rotation targets 150 Ashby, 120 Greenhouse and 30 Lever boards. It prioritizes unvisited sources and known relevant employers, then uses a deterministic hash across the rest of the directory rather than an alphabetic or largest-employer-only sample. Subsequent runs rotate toward unvisited sources. A source that was skipped before an employer request is not counted as covered.

Public API requests are manual and bounded: maximum 500 per rolling 24 hours, default 320 per run including robots requests, at least one second between requests to a host, 15-second timeouts, no redirect following or automatic retries. Current robots rules are evaluated against the exact API path with `robots-parser`; server/network failures hold that host. An unavailable robots file (HTTP 4xx other than throttling) is handled under [RFC 9309 section 2.3.1.3](https://www.rfc-editor.org/rfc/rfc9309.html#section-2.3.1.3); it does not bypass authentication on any job endpoint. The first pass incorrectly skipped Ashby when its robots file returned 401; that status handling was corrected and skipped sources were made eligible again.

Candidate retention is deliberately permissive: AI plus building evidence, or an explicit AI builder title. Product, operations, design and engineering paths are eligible; engineering requirements are not a hard retrieval exclusion. **These signals are not a classifier.** Prior reviewed posting identities, including negatives, are excluded. Every potential lead retains metadata; full descriptions are capped at 25 per source and an equal share of a 64 MiB/run payload budget. Metadata-only candidates remain pending full-text fetch, never rejected. Missing location eligibility and possible evergreen/talent-pool posts remain explicit. Source/description versions, failures and cap counts are stored privately. No candidate is published by collection.

Automated deep classification still needs a model API credential. Existing OpenAI and Jooble environment variables are absent, as are Hirebase, Adzuna and Brave credentials. The existing structured assessment research can guide the next stage, but retrieval counts must not be reported as category precision or as fresh confirmed builder jobs. Source yield should ultimately mean independently assessed, employer-verified matches, not keyword-hit volume.

### Measured trial results

Two completed manual passes attempted **450 distinct employer boards**, of which **437 returned usable feeds** and 13 failed. The first pass visited 300 registry entries but skipped 150 Ashby sources before fetching jobs; those skips are excluded from coverage. The corrected second pass fetched those Ashby sources and another 150 Greenhouse/Lever sources.

| Provider | Boards attempted | Usable feeds | Published postings read |
| --- | ---: | ---: | ---: |
| Ashby | 150 | 147 | 3,702 |
| Greenhouse | 240 | 235 | 7,202 |
| Lever | 60 | 55 | 987 |
| Total | 450 | 437 | 11,891 |

The pipeline reserved **456 HTTP attempts**, including six robots requests; separate research/browser diagnostics are not counted in that pipeline ledger. There are **3,708 distinct potential-candidate metadata records**, with **1,622 current full descriptions** retained. The other 2,086 require a full-text fetch before assessment. Existing reviewed posting identities and exact canonical-URL duplicates were both checked: zero reviewed duplicates or duplicate canonical-URL groups were found in this pool. None of these counts establishes builder fit or an active vacancy; talent-pool posts and traditional engineer/PM false positives are included by permissive retrieval. No new jobs were published, and the browsing inventory remains 22.

The Lever lane surfaced Artera's [AI Builder](https://jobs.lever.co/artera-2/66019d50-3ae7-490e-9d64-6d4ad7e60ad4) and [Associate AI Builder](https://jobs.lever.co/artera-2/eae88c70-fbf5-4525-890c-d3f9377418b0) postings. Their duties include personal coding with agentic tools and ownership from customer discovery through production; accepted backgrounds include product and design alongside engineering. The customer-specific implementation model still needs comparison against the user's solutions-role exclusions. These are useful retrieval leads, not user approvals or final recommendations. Kettle's PM/prototyping role similarly needs a central-building versus traditional-PM assessment; Alt design roles need U.S. remote-eligibility confirmation.

Retrieval v2 fixes a title-boundary overmatch (`Product Engineering` was being ranked as `Product Engineer`) and flags possible evergreen postings. Stored current full-text candidates were reranked offline without new employer requests, publication, or freshness changes. Metadata-only entries retain their original retrieval method until full text is fetched. The database occupied approximately 37 MB after this trial; no paid storage or model API was enabled.
