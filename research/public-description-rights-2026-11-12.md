# Public description reuse check — November 12, 2026

## What the primary sources establish

- [Ashby's public Job Postings API](https://developers.ashbyhq.com/docs/public-job-posting-api) supplies the full `descriptionHtml` for currently published postings and describes using it to populate **the organization's own careers page**. Its `isListed` field distinguishes jobs meant to appear in a board list from direct-link-only postings. This supports collecting and verifying public employer content, but the cited page does not expressly grant an independent third-party board permission to republish every full description.
- [Greenhouse's Job Board API](https://docs.greenhouse.io/job-board.html) exposes full `content` through `?content=true`. [Greenhouse's support guide](https://support.greenhouse.io/hc/en-us/articles/10568627186203-Greenhouse-API-overview) describes the API as a way for employers to build their own custom job boards or career sites. This does not by itself establish a blanket republication license for an independent aggregator.
- Greenhouse documents a [FlexJobs integration](https://support.greenhouse.io/hc/en-us/articles/360000468952-FlexJobs-integration) that imports descriptions into a separate reviewed board. That is evidence that third-party syndication can occur, but it is an integration configured by the employer; it is not permission for this board to do the same without a source-specific basis.

## Owner decision — November 12, 2026

The owner chose to publish full descriptions from verified, publicly listed employer postings unless a source expressly prohibits reuse. We do not need individual employer permission as a launch gate. Keep the canonical employer URL, attribution, last-checked time, and prompt removal of withdrawn postings or content challenged by its owner. Use an original summary and employer link for a source that explicitly forbids full-text reuse. This is a product risk decision, not a claim that public API access itself grants a license.
