import type { SourceListingRecord, SourceRecord } from "../schemas/index.js";
import type { FetchContext, SourceAdapter, SourceCandidate, SourceTestResult } from "./types.js";

export class LinkedInManualAdapter implements SourceAdapter {
  readonly id = "linkedin" as const;

  async fetchCandidates(): Promise<SourceCandidate[]> {
    return [];
  }

  async fetchByUrl(url: string, ctx: FetchContext): Promise<SourceCandidate> {
    return {
      source: ctx.source,
      sourceUrl: url,
      metadata: ctx.manualMetadata ?? {
        title: "Unknown LinkedIn role",
        company: "Unknown company",
      },
      fetchStatus: "no_fetch",
      sourceSignal: {
        adapter: this.id,
        reusable: false,
        fetchPolicy: "no_fetch",
        sourceUrl: url,
      },
    };
  }

  async refreshListing(listing: SourceListingRecord, ctx: FetchContext) {
    return {
      sourceListingId: listing.id,
      status: "no_fetch" as const,
      checkedAt: ctx.now,
      stillVisible: true,
    };
  }

  async testSource(source: SourceRecord): Promise<SourceTestResult> {
    return {
      ok: source.enabled,
      message: source.enabled
        ? "LinkedIn is configured for no-fetch manual capture."
        : "LinkedIn source is disabled.",
    };
  }
}
