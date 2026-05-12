import { describe, expect, it } from "vitest";

import { createSourceListingRecord } from "../dedupe/index.js";
import { normalizeCandidate } from "../normalize/index.js";
import { SourceListingRecordSchema } from "../schemas/index.js";

describe("source listing records", () => {
  it("preserves partial metadata and source error state", () => {
    const candidate = normalizeCandidate({
      title: "AI Solutions Builder",
      company: "Impiricus",
      sourceId: "source_1",
      sourceType: "ats",
      adapter: "greenhouse",
      sourceUrl: "https://job-boards.greenhouse.io/impiricus/jobs/5214167008",
      fetchStatus: "error",
      errorMessage: "Description fetch failed",
    });

    const listing = createSourceListingRecord(candidate, {
      id: "listing_1",
      jobId: "job_1",
      now: "2026-05-12T20:00:00.000Z",
    });

    expect(SourceListingRecordSchema.safeParse(listing).success).toBe(true);
    expect(listing.fetchStatus).toBe("error");
    expect(listing.errorMessage).toBe("Description fetch failed");
    expect(listing.normalizedMetadata).toMatchObject({
      title: "AI Solutions Builder",
      company: "Impiricus",
    });
    expect(listing.normalizedMetadata.location).toBeUndefined();
    expect(JSON.stringify(listing)).not.toContain("descriptionText");
  });
});
