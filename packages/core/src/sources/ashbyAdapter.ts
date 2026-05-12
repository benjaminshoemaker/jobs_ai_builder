import type { SourceRecord } from "../schemas/index.js";
import { AtsAdapterBase, candidate, inferWorkType, sourceCompany } from "./atsShared.js";
import { defaultHttpJsonFetcher, type HttpJsonFetcher } from "./http.js";
import type { FetchContext, SourceAdapter, SourceCandidate, SourceTestResult } from "./types.js";

type AshbyJob = {
  id?: string;
  title?: string;
  location?: string;
  workplaceType?: string;
  descriptionPlain?: string;
  publishedAt?: string;
  jobUrl?: string;
  compensation?: {
    scrapeableCompensationSalarySummary?: string;
    compensationTierSummary?: string;
  };
};

export class AshbyAdapter extends AtsAdapterBase implements SourceAdapter {
  readonly id = "ashby" as const;

  constructor(fetchJson: HttpJsonFetcher = defaultHttpJsonFetcher) {
    super(fetchJson);
  }

  async fetchCandidates(ctx: FetchContext): Promise<SourceCandidate[]> {
    const payload = await this.safeFetch(this.url(ctx.source));
    if (!isAshbyPayload(payload)) return [];

    return payload.jobs.slice(0, ctx.limit).flatMap((job) => {
      if (!job.title || !job.jobUrl) return [];
      return candidate(ctx.source, {
        sourceUrl: job.jobUrl,
        externalId: job.id ?? job.jobUrl,
        metadata: {
          title: job.title,
          company: sourceCompany(ctx.source),
          ...(job.location ? { location: job.location } : {}),
          ...(inferWorkType(job.location, job.workplaceType)
            ? { workType: inferWorkType(job.location, job.workplaceType) }
            : {}),
          ...(job.publishedAt ? { postedDate: job.publishedAt } : {}),
          ...(job.compensation?.scrapeableCompensationSalarySummary
            ? { compensationRaw: job.compensation.scrapeableCompensationSalarySummary }
            : {}),
        },
        transientDescription: job.descriptionPlain,
      });
    });
  }

  async testSource(source: SourceRecord): Promise<SourceTestResult> {
    return this.testByFetching(source, this.url(source));
  }

  protected countJobs(payload: unknown): number {
    return isAshbyPayload(payload) ? payload.jobs.length : 0;
  }

  private url(source: SourceRecord): string {
    return `https://api.ashbyhq.com/posting-api/job-board/${source.companySlug ?? source.id}?includeCompensation=true`;
  }
}

function isAshbyPayload(payload: unknown): payload is { jobs: AshbyJob[] } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "jobs" in payload &&
    Array.isArray(payload.jobs)
  );
}
