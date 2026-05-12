import type { SourceRecord } from "../schemas/index.js";
import type { FetchContext, SourceAdapter, SourceCandidate, SourceTestResult } from "./types.js";

export class ManualAdapter implements SourceAdapter {
  readonly id = "manual" as const;

  async fetchCandidates(): Promise<SourceCandidate[]> {
    return [];
  }

  async fetchByUrl(url: string, ctx: FetchContext): Promise<SourceCandidate> {
    const metadata = ctx.manualMetadata ?? {
      title: "Unknown manual role",
      company: "Unknown company",
    };

    return {
      source: ctx.source,
      sourceUrl: url,
      metadata,
      fetchStatus: "ok",
      sourceSignal: {
        adapter: this.id,
        reusable: ctx.reusable ?? ctx.source.reusable,
        fetchPolicy: "no_fetch",
        sourceUrl: url,
      },
    };
  }

  async testSource(source: SourceRecord): Promise<SourceTestResult> {
    return {
      ok: source.enabled,
      message: source.enabled ? "Manual source is available." : "Manual source is disabled.",
    };
  }
}
