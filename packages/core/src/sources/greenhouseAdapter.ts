import type { SourceRecord } from "../schemas/index.js";
import { AtsAdapterBase, candidate, inferWorkType, sourceCompany } from "./atsShared.js";
import { defaultHttpJsonFetcher, type HttpJsonFetcher } from "./http.js";
import type { FetchContext, SourceAdapter, SourceCandidate, SourceTestResult } from "./types.js";

type GreenhouseJob = {
  id?: number | string;
  title?: string;
  updated_at?: string;
  location?: { name?: string };
  absolute_url?: string;
  content?: string;
};

export class GreenhouseAdapter extends AtsAdapterBase implements SourceAdapter {
  readonly id = "greenhouse" as const;

  constructor(fetchJson: HttpJsonFetcher = defaultHttpJsonFetcher) {
    super(fetchJson);
  }

  async fetchCandidates(ctx: FetchContext): Promise<SourceCandidate[]> {
    const payload = await this.safeFetch(this.url(ctx.source));
    if (!isGreenhousePayload(payload)) return [];

    return payload.jobs.slice(0, ctx.limit).flatMap((job) => {
      if (!job.title || !job.absolute_url) return [];
      const location = job.location?.name;
      return candidate(ctx.source, {
        sourceUrl: job.absolute_url,
        externalId: job.id === undefined ? job.absolute_url : String(job.id),
        metadata: {
          title: job.title,
          company: sourceCompany(ctx.source),
          ...(location ? { location } : {}),
          ...(inferWorkType(location) ? { workType: inferWorkType(location) } : {}),
          ...(job.updated_at ? { postedDate: job.updated_at } : {}),
        },
        transientDescription: job.content,
      });
    });
  }

  async testSource(source: SourceRecord): Promise<SourceTestResult> {
    return this.testByFetching(source, this.url(source));
  }

  protected countJobs(payload: unknown): number {
    return isGreenhousePayload(payload) ? payload.jobs.length : 0;
  }

  private url(source: SourceRecord): string {
    return `https://boards-api.greenhouse.io/v1/boards/${source.companySlug ?? source.id}/jobs?content=true`;
  }
}

function isGreenhousePayload(payload: unknown): payload is { jobs: GreenhouseJob[] } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "jobs" in payload &&
    Array.isArray(payload.jobs)
  );
}
