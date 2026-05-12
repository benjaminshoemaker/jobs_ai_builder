import { readdir } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import type { Command } from "commander";
import {
  ManualAdapter,
  SourceRecordSchema,
  createDefaultSourceRegistry,
  createStoragePaths,
  atomicWriteJson,
  readJsonFile,
  type Adapter,
  type SourceRecord,
} from "../../../../packages/core/src/index.js";

export function registerSourcesCommand(program: Command): void {
  const sources = program.command("sources").description("Manage configured job sources");

  sources
    .command("add <url>")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (url: string, options: { dataDir: string }) => {
      const source = createSourceFromUrl(url);
      const paths = createStoragePaths(options.dataDir);
      await atomicWriteJson(path.join(paths.sourcesDir, `${source.id}.json`), SourceRecordSchema, source);
      console.log(`Added source ${source.id} (${source.adapter}).`);
    });

  sources
    .command("list")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (options: { dataDir: string }) => {
      for (const source of await listSources(options.dataDir)) {
        console.log(`${source.id}\t${source.adapter}\t${source.enabled ? "enabled" : "disabled"}\t${source.reusable ? "reusable" : "one-off"}`);
      }
    });

  sources
    .command("test <id>")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .action(async (id: string, options: { dataDir: string }) => {
      const source = (await listSources(options.dataDir)).find((item) => item.id === id);
      if (!source) {
        console.log(`Source ${id} not found.`);
        return;
      }
      const adapter = source.adapter === "manual" ? new ManualAdapter() : createDefaultSourceRegistry().get(source.adapter);
      const result = adapter ? await adapter.testSource(source) : { ok: false, message: "No adapter." };
      console.log(`${source.id}: ${result.message}`);
    });
}

function createSourceFromUrl(url: string): SourceRecord {
  const classified = classifySourceUrl(url);
  return SourceRecordSchema.parse({
    schemaVersion: 1,
    id: `source_${classified.adapter}_${hash(classified.companySlug ?? url)}`,
    type: classified.type,
    adapter: classified.adapter,
    name: classified.companySlug ?? classified.adapter,
    reusable: classified.adapter !== "manual",
    enabled: true,
    ...(classified.companySlug ? { companySlug: classified.companySlug } : {}),
    baseUrl: url,
  });
}

function classifySourceUrl(url: string): { adapter: Adapter; type: SourceRecord["type"]; companySlug?: string } {
  const parsed = new URL(url);
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parsed.hostname.includes("ashbyhq.com")) return { adapter: "ashby", type: "ats", companySlug: parts[0] };
  if (parsed.hostname.includes("greenhouse.io")) return { adapter: "greenhouse", type: "ats", companySlug: parts[0] };
  if (parsed.hostname.includes("lever.co")) return { adapter: "lever", type: "ats", companySlug: parts[0] };
  return { adapter: "manual", type: "manual" };
}

async function listSources(dataDir: string): Promise<SourceRecord[]> {
  const { sourcesDir } = createStoragePaths(dataDir);
  let files: string[];
  try {
    files = await readdir(sourcesDir);
  } catch {
    return [];
  }
  return Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => readJsonFile(path.join(sourcesDir, file), SourceRecordSchema)),
  );
}

function hash(value: string): string {
  return createHash("sha1").update(value).digest("hex").slice(0, 12);
}
