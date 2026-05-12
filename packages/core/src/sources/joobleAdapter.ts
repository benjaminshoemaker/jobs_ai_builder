import { readConfiguredCredential } from "../config/index.js";
import type { SourceRecord } from "../schemas/index.js";
import { candidate, inferWorkType } from "./atsShared.js";
import { defaultHttpJsonFetcher, type HttpJsonFetcher } from "./http.js";
import type { FetchContext, SourceAdapter, SourceCandidate, SourceTestResult } from "./types.js";

type JoobleJob = {
  title?: string;
  location?: string;
  snippet?: string;
  salary?: string;
  link?: string;
  company?: string;
  updated?: string;
  id?: number | string;
};

export class MissingSourceCredentialError extends Error {
  constructor(readonly envVar: string, readonly sourceId: string) {
    super(`Missing required source credential: ${envVar}`);
    this.name = "MissingSourceCredentialError";
  }
}

export class JoobleAdapter implements SourceAdapter {
  readonly id = "jooble" as const;

  constructor(private readonly fetchJson: HttpJsonFetcher = defaultHttpJsonFetcher) {}

  async fetchCandidates(ctx: FetchContext): Promise<SourceCandidate[]> {
    const envVar =
      ctx.source.credentialEnvVar ?? ctx.config.broadApiCredentialEnvVar;
    const credential = readConfiguredCredential(
      { broadApiCredentialEnvVar: envVar },
      ctx.env ?? process.env,
    );
    if (!credential) {
      throw new MissingSourceCredentialError(envVar, ctx.source.id);
    }

    const payload = await this.fetchJson(`https://jooble.org/api/${credential}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords: ctx.query ?? ctx.source.defaultQuery ?? ctx.config.querySeeds[0] ?? "",
        location: "",
        page: "1",
        ResultOnPage: String(ctx.limit),
        companysearch: "false",
      }),
    });

    if (!isJooblePayload(payload)) return [];

    return payload.jobs.slice(0, ctx.limit).flatMap((job) => {
      if (!job.title || !job.company || !job.link) return [];
      return candidate(ctx.source, {
        sourceUrl: job.link,
        externalId: job.id === undefined ? job.link : String(job.id),
        metadata: {
          title: job.title,
          company: job.company,
          ...(job.location ? { location: job.location } : {}),
          ...(inferWorkType(job.location) ? { workType: inferWorkType(job.location) } : {}),
          ...(job.salary ? { compensationRaw: job.salary } : {}),
          ...(job.updated ? { postedDate: job.updated } : {}),
        },
        transientDescription: job.snippet,
      });
    });
  }

  async testSource(source: SourceRecord): Promise<SourceTestResult> {
    return {
      ok: source.enabled,
      message: source.enabled
        ? "Jooble source is configured; live fetch requires credential env."
        : "Jooble source is disabled.",
    };
  }
}

function isJooblePayload(payload: unknown): payload is { jobs: JoobleJob[] } {
  return (
    typeof payload === "object" &&
    payload !== null &&
    "jobs" in payload &&
    Array.isArray(payload.jobs)
  );
}
