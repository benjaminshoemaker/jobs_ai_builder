import path from "node:path";

import { z } from "zod";

import { atomicWriteJson, createStoragePaths, readJsonFile } from "../storage/index.js";

export const DEFAULT_API_REQUEST_LIMIT = 500;

export const ApiUsageRecordSchema = z.object({
  schemaVersion: z.literal(1),
  provider: z.string().min(1),
  windowStartedAt: z.string().datetime({ offset: true }),
  requestLimit: z.number().int().positive(),
  requestsUsed: z.number().int().nonnegative(),
  requestEvents: z.array(
    z.object({
      timestamp: z.string().datetime({ offset: true }),
      count: z.number().int().positive(),
      reason: z.string().min(1),
    }),
  ),
});
export type ApiUsageRecord = z.infer<typeof ApiUsageRecordSchema>;

export class ApiBudgetExceededError extends Error {
  constructor(
    readonly provider: string,
    readonly requested: number,
    readonly remaining: number,
  ) {
    super(`API budget exceeded for ${provider}: requested ${requested}, remaining ${remaining}`);
    this.name = "ApiBudgetExceededError";
  }
}

export type ReserveApiRequestsInput = {
  dataDir: string;
  provider: string;
  requestCount: number;
  now: string;
  reason: string;
  requestLimit?: number;
};

export async function reserveApiRequests(input: ReserveApiRequestsInput): Promise<ApiUsageRecord> {
  if (!Number.isInteger(input.requestCount) || input.requestCount <= 0) {
    throw new Error(`Invalid API request count: ${input.requestCount}`);
  }

  const current = await readApiUsage(input.dataDir, input.provider, input.now, input.requestLimit);
  const remaining = current.requestLimit - current.requestsUsed;
  if (input.requestCount > remaining) {
    throw new ApiBudgetExceededError(input.provider, input.requestCount, remaining);
  }

  const next = ApiUsageRecordSchema.parse({
    ...current,
    requestLimit: input.requestLimit ?? current.requestLimit,
    requestsUsed: current.requestsUsed + input.requestCount,
    requestEvents: [
      ...current.requestEvents,
      {
        timestamp: input.now,
        count: input.requestCount,
        reason: input.reason,
      },
    ],
  });

  return atomicWriteJson(apiUsageFile(input.dataDir, input.provider), ApiUsageRecordSchema, next);
}

export async function readApiUsage(
  dataDir: string,
  provider: string,
  now: string,
  requestLimit = DEFAULT_API_REQUEST_LIMIT,
): Promise<ApiUsageRecord> {
  try {
    const existing = await readJsonFile(apiUsageFile(dataDir, provider), ApiUsageRecordSchema);
    return ApiUsageRecordSchema.parse({
      ...existing,
      requestLimit,
    });
  } catch (error) {
    if (isMissingFileError(error)) {
      return ApiUsageRecordSchema.parse({
        schemaVersion: 1,
        provider,
        windowStartedAt: now,
        requestLimit,
        requestsUsed: 0,
        requestEvents: [],
      });
    }
    throw error;
  }
}

export function remainingApiRequests(record: ApiUsageRecord): number {
  return record.requestLimit - record.requestsUsed;
}

function apiUsageFile(dataDir: string, provider: string): string {
  return path.join(createStoragePaths(dataDir).dataDir, "api-usage", `${safeFileName(provider)}.json`);
}

function safeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").toLowerCase();
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
