import {
  EventRecordSchema,
  type SourceListingRecord,
} from "../schemas/index.js";
import { appendEvent } from "../storage/index.js";
import { getErrorStatus } from "./http.js";
import { MissingSourceCredentialError } from "./joobleAdapter.js";
import type { FetchContext, SourceAdapter, SourceCandidate } from "./types.js";

export type SourceFetchTask = {
  adapter: SourceAdapter;
  ctx: FetchContext;
};

export type SourceFetchFailure = {
  sourceId: string;
  adapter: SourceAdapter["id"];
  fetchStatus: SourceListingRecord["fetchStatus"];
  errorMessage: string;
};

export type SourceFetchBatchResult = {
  candidates: SourceCandidate[];
  failures: SourceFetchFailure[];
};

export class SourceFetchBatchError extends Error {
  constructor(readonly failures: SourceFetchFailure[]) {
    super("No enabled source completed successfully.");
    this.name = "SourceFetchBatchError";
  }
}

export async function fetchSourcesWithFailureHandling(
  tasks: SourceFetchTask[],
  options: {
    allowPartialSources: boolean;
    eventsFile?: string;
  },
): Promise<SourceFetchBatchResult> {
  const candidates: SourceCandidate[] = [];
  const failures: SourceFetchFailure[] = [];
  let successfulSources = 0;

  for (const task of tasks) {
    try {
      const sourceCandidates = await task.adapter.fetchCandidates(task.ctx);
      successfulSources += 1;
      candidates.push(...sourceCandidates);
    } catch (error) {
      if (error instanceof MissingSourceCredentialError && !options.allowPartialSources) {
        throw error;
      }

      const failure = {
        sourceId: task.ctx.source.id,
        adapter: task.adapter.id,
        fetchStatus: statusFromError(error),
        errorMessage: error instanceof Error ? error.message : String(error),
      };
      failures.push(failure);
      if (options.eventsFile) {
        await appendSourceFailureEvent(options.eventsFile, task.ctx, failure);
      }
    }
  }

  if (successfulSources === 0) {
    throw new SourceFetchBatchError(failures);
  }

  return { candidates, failures };
}

function statusFromError(error: unknown): SourceListingRecord["fetchStatus"] {
  const status = getErrorStatus(error);
  if (status === 429) return "rate_limited";
  if (status === 404 || error instanceof MissingSourceCredentialError) return "unavailable";
  return "error";
}

async function appendSourceFailureEvent(
  eventsFile: string,
  ctx: FetchContext,
  failure: SourceFetchFailure,
) {
  await appendEvent(eventsFile, EventRecordSchema, {
    schemaVersion: 1,
    id: `event_source_failed_${ctx.source.id}_${safeId(ctx.now)}`,
    timestamp: ctx.now,
    actor: "system",
    type: "source.fetch.failed",
    sourceId: ctx.source.id,
    payload: {
      adapter: failure.adapter,
      fetchStatus: failure.fetchStatus,
      errorMessage: failure.errorMessage,
    },
  });
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}
