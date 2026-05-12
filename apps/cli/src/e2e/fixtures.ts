import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  JobRecordSchema,
  SourceRecordSchema,
  atomicWriteJson,
  createStoragePaths,
  readJsonFile,
  type JobRecord,
} from "../../../../packages/core/src/index.js";

export async function writeMockSourceFile(dataDir: string, candidates = defaultCandidates()): Promise<string> {
  const mockFile = path.join(dataDir, "mock-source.json");
  await writeFile(mockFile, JSON.stringify(candidates), "utf8");
  return mockFile;
}

export function defaultCandidates() {
  return [
    {
      title: "AI Builder",
      company: "Example AI",
      sourceUrl: "https://example.com/jobs/ai-builder",
      location: "Remote",
      workType: "remote" as const,
    },
    {
      title: "Product Builder",
      company: "Example Labs",
      sourceUrl: "https://example.com/jobs/product-builder",
      location: "Hybrid - New York",
      workType: "hybrid" as const,
    },
  ];
}

export async function readJobs(dataDir: string): Promise<JobRecord[]> {
  const paths = createStoragePaths(dataDir);
  const files = await readdir(paths.jobsDir);
  return Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => readJsonFile(path.join(paths.jobsDir, file), JobRecordSchema)),
  );
}

export async function writeMockSourceRecord(dataDir: string): Promise<void> {
  const paths = createStoragePaths(dataDir);
  await atomicWriteJson(path.join(paths.sourcesDir, "source_mock.json"), SourceRecordSchema, {
    schemaVersion: 1,
    id: "source_mock",
    type: "manual",
    adapter: "manual",
    name: "Mock Source",
    reusable: true,
    enabled: true,
  });
}
