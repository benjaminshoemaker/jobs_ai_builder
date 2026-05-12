import type { CandidateMetadata, SourceRecord, WorkType } from "../schemas/index.js";
import type { SourceCandidate, SourceTestResult } from "./types.js";
import { getErrorStatus, type HttpJsonFetcher } from "./http.js";

export abstract class AtsAdapterBase {
  protected constructor(protected readonly fetchJson: HttpJsonFetcher) {}

  protected async testByFetching(source: SourceRecord, url: string): Promise<SourceTestResult> {
    const started = Date.now();
    try {
      const payload = await this.fetchJson(url);
      const sampleCount = this.countJobs(payload);
      return {
        ok: true,
        message: `${source.name} returned ${sampleCount} jobs.`,
        latencyMs: Date.now() - started,
        sampleCount,
      };
    } catch (error) {
      const status = getErrorStatus(error);
      return {
        ok: false,
        message: status === 429 ? "Source is rate limited." : "Source fetch failed.",
        latencyMs: Date.now() - started,
        rateLimited: status === 429,
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

  protected async safeFetch(url: string): Promise<unknown | undefined> {
    try {
      return await this.fetchJson(url);
    } catch {
      return undefined;
    }
  }

  protected abstract countJobs(payload: unknown): number;
}

export function sourceCompany(source: SourceRecord): string {
  return source.name;
}

export function inferWorkType(location?: string, explicit?: string): WorkType | undefined {
  const text = `${location ?? ""} ${explicit ?? ""}`.toLowerCase();
  if (/\bremote\b/.test(text)) return "remote";
  if (/\bhybrid\b/.test(text)) return "hybrid";
  if (/\bonsite\b|\bon-site\b|\bin office\b/.test(text)) return "onsite";
  return undefined;
}

export function candidate(
  source: SourceRecord,
  data: {
    sourceUrl: string;
    externalId?: string;
    metadata: CandidateMetadata;
    transientDescription?: string;
  },
): SourceCandidate {
  return {
    source,
    sourceUrl: data.sourceUrl,
    ...(data.externalId ? { externalId: data.externalId } : {}),
    metadata: data.metadata,
    ...(data.transientDescription ? { transientDescription: data.transientDescription } : {}),
    fetchStatus: "ok",
    sourceSignal: {
      adapter: source.adapter,
      reusable: source.reusable,
      fetchPolicy: "fetch",
      sourceUrl: data.sourceUrl,
    },
  };
}
