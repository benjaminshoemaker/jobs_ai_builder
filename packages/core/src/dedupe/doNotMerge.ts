import { readdir } from "node:fs/promises";
import path from "node:path";

import {
  DoNotMergeRecordSchema,
  EventRecordSchema,
  type DoNotMergeRecord,
} from "../schemas/index.js";
import {
  appendEvent,
  atomicWriteJson,
  createStoragePaths,
  readJsonFile,
} from "../storage/index.js";

export type CreateDoNotMergeInput = {
  jobIdA: string;
  jobIdB: string;
  reason?: string;
  createdAt?: string;
};

export function createDoNotMergeRecord(input: CreateDoNotMergeInput): DoNotMergeRecord {
  const [jobIdA, jobIdB] = normalizeDoNotMergePair(input.jobIdA, input.jobIdB);
  return DoNotMergeRecordSchema.parse({
    schemaVersion: 1,
    id: `do_not_merge_${safeId(jobIdA)}_${safeId(jobIdB)}`,
    createdAt: input.createdAt ?? new Date().toISOString(),
    jobIdA,
    jobIdB,
    ...(input.reason ? { reason: input.reason } : {}),
  });
}

export async function createDoNotMergeDecision(
  dataDir: string,
  input: CreateDoNotMergeInput,
): Promise<DoNotMergeRecord> {
  const paths = createStoragePaths(dataDir);
  const record = createDoNotMergeRecord(input);

  await atomicWriteJson(
    path.join(paths.doNotMergeDir, `${record.id}.json`),
    DoNotMergeRecordSchema,
    record,
  );

  await appendEvent(paths.eventsFile, EventRecordSchema, {
    schemaVersion: 1,
    id: `event_${record.id}_${safeId(record.createdAt)}`,
    timestamp: record.createdAt,
    actor: "user",
    type: "job.do_not_merge_created",
    jobId: record.jobIdA,
    payload: {
      otherJobId: record.jobIdB,
      doNotMergeId: record.id,
      reason: record.reason,
    },
  });

  return record;
}

export async function listDoNotMergeDecisions(dataDir: string): Promise<DoNotMergeRecord[]> {
  const { doNotMergeDir } = createStoragePaths(dataDir);
  let fileNames: string[];
  try {
    fileNames = await readdir(doNotMergeDir);
  } catch (error) {
    if (isMissingFileError(error)) {
      return [];
    }
    throw error;
  }

  const records = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".json"))
      .map((fileName) =>
        readJsonFile(path.join(doNotMergeDir, fileName), DoNotMergeRecordSchema),
      ),
  );

  return records.sort((left, right) => left.id.localeCompare(right.id));
}

export function hasDoNotMergeDecision(
  records: DoNotMergeRecord[],
  jobIdA: string,
  jobIdB: string,
): boolean {
  const [normalizedA, normalizedB] = normalizeDoNotMergePair(jobIdA, jobIdB);
  return records.some(
    (record) => record.jobIdA === normalizedA && record.jobIdB === normalizedB,
  );
}

export function normalizeDoNotMergePair(jobIdA: string, jobIdB: string): [string, string] {
  return [jobIdA, jobIdB].sort((left, right) => left.localeCompare(right)) as [
    string,
    string,
  ];
}

function safeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").toLowerCase();
}

function isMissingFileError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}
