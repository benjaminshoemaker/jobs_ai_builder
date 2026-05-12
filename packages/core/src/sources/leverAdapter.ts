import type { SourceRecord } from "../schemas/index.js";
import { AtsAdapterBase, candidate, inferWorkType, sourceCompany } from "./atsShared.js";
import { defaultHttpJsonFetcher, type HttpJsonFetcher } from "./http.js";
import type { FetchContext, SourceAdapter, SourceCandidate, SourceTestResult } from "./types.js";

type LeverPosting = {
  id?: string;
  text?: string;
  hostedUrl?: string;
  createdAt?: number;
  categories?: {
    location?: string;
    commitment?: string;
  };
  descriptionPlain?: string;
};

export class LeverAdapter extends AtsAdapterBase implements SourceAdapter {
  readonly id = "lever" as const;

  constructor(fetchJson: HttpJsonFetcher = defaultHttpJsonFetcher) {
    super(fetchJson);
  }

  async fetchCandidates(ctx: FetchContext): Promise<SourceCandidate[]> {
    const payload = await this.safeFetch(this.url(ctx.source));
    if (!Array.isArray(payload)) return [];

    return payload.slice(0, ctx.limit).flatMap((posting: LeverPosting) => {
      if (!posting.text || !posting.hostedUrl) return [];
      const location = posting.categories?.location;
      return candidate(ctx.source, {
        sourceUrl: posting.hostedUrl,
        externalId: posting.id ?? posting.hostedUrl,
        metadata: {
          title: posting.text,
          company: sourceCompany(ctx.source),
          ...(location ? { location } : {}),
          ...(inferWorkType(location, posting.categories?.commitment)
            ? { workType: inferWorkType(location, posting.categories?.commitment) }
            : {}),
          ...(posting.createdAt ? { postedDate: new Date(posting.createdAt).toISOString() } : {}),
        },
        transientDescription: posting.descriptionPlain,
      });
    });
  }

  async testSource(source: SourceRecord): Promise<SourceTestResult> {
    return this.testByFetching(source, this.url(source));
  }

  protected countJobs(payload: unknown): number {
    return Array.isArray(payload) ? payload.length : 0;
  }

  private url(source: SourceRecord): string {
    return `https://api.lever.co/v0/postings/${source.companySlug ?? source.id}?mode=json`;
  }
}
