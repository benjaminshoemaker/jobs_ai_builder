import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import type { Command } from "commander";
import {
  ApiBudgetExceededError,
  createDefaultConfig,
  createDefaultSourceRegistry,
  createReviewQueue,
  createStoragePaths,
  discoverJobs,
  loadConfig,
  readJsonFile,
  readApiUsage,
  remainingApiRequests,
  reserveApiRequests,
  SourceListingRecordSchema,
  persistReviewLabel,
  recordSessionInterrupted,
  type SourceAdapter,
  type SourceCandidate,
  type SourceListingRecord,
  type SourceRecord,
  type DiscoverRegistry,
} from "../../../../packages/core/src/index.js";
import { ReviewInterruptedError, runReviewFlow } from "../review/reviewPrompts.js";

export function registerDiscoverCommand(program: Command): void {
  program
    .command("discover")
    .description("Fetch, rank, and review candidate jobs")
    .option("--interactive <value>", "run prompt-based review", "true")
    .option("--data-dir <dir>", "runtime data directory", "data")
    .option("--mock-source-file <path>", "read source candidates from a JSON fixture")
    .option("--live", "use live API sources")
    .option("--max-api-requests <n>", "maximum live API requests for this run", "1")
    .option("--api-budget <n>", "local API request budget cap", "500")
    .option("--env-file <path>", "load environment variables from a local file", ".env.local")
    .option("--dry-run", "show the live request plan without calling the API")
    .action(async (options: DiscoverCommandOptions) => {
      const config = await loadConfig(options.dataDir).catch(() => createDefaultConfig());
      loadOptionalEnvFile(options.envFile);
      const now = new Date().toISOString();
      const planned = await createDiscoveryPlan({ options, config, now });
      if (planned.dryRunMessage) {
        console.log(planned.dryRunMessage);
        return;
      }
      if (planned.sources.length === 0) {
        console.log("No discovery source selected. Use --live for Jooble API discovery or --mock-source-file for a fixture.");
        return;
      }
      const result = await discoverJobs({
        dataDir: options.dataDir,
        config,
        sources: planned.sources,
        registry: planned.registry,
        now,
        interactive: false,
        allowPartialSources: true,
      });

      console.log(`Selected ${result.selected.length} candidate(s). Status: ${result.status}.`);
      if (options.interactive !== "false" && result.selected.length > 0) {
        const sourceListings = await readSourceListings(options.dataDir, result.selected.flatMap((job) => job.sourceListingIds));
        try {
          await runReviewFlow({
            items: createReviewQueue(result.selected, sourceListings, planned.sources, { limit: result.selected.length }),
            onOutcome: async (outcome) => {
              if (!outcome.reviewLabel) return;
              await persistReviewLabel({
                dataDir: options.dataDir,
                jobId: outcome.jobId,
                reviewLabel: outcome.reviewLabel,
                notes: outcome.notes,
                now: new Date().toISOString(),
                sessionId: result.session.id,
              });
            },
            onInterrupted: async (context) => {
              await recordSessionInterrupted({
                dataDir: options.dataDir,
                sessionId: result.session.id,
                now: new Date().toISOString(),
                reviewedJobIds: context.completedOutcomes.map((outcome) => outcome.jobId),
                reason: context.error instanceof Error ? context.error.message : "unknown interruption",
              });
            },
          });
        } catch (error) {
          if (error instanceof ReviewInterruptedError) {
            console.log(`Review interrupted after ${error.completedOutcomes.length} completed review(s).`);
            return;
          }
          throw error;
        }
      }
    });
}

type DiscoverCommandOptions = {
  interactive: string;
  dataDir: string;
  mockSourceFile?: string;
  live?: boolean;
  maxApiRequests: string;
  apiBudget: string;
  envFile: string;
  dryRun?: boolean;
};

type DiscoveryPlan = {
  sources: SourceRecord[];
  registry: DiscoverRegistry;
  dryRunMessage?: string;
};

async function createDiscoveryPlan(input: {
  options: DiscoverCommandOptions;
  config: Awaited<ReturnType<typeof loadConfig>>;
  now: string;
}): Promise<DiscoveryPlan> {
  if (input.options.mockSourceFile) {
    return createMockRegistry(input.options.mockSourceFile);
  }

  if (!input.options.live) {
    return { sources: [], registry: createDefaultSourceRegistry() };
  }

  const requestCount = parsePositiveInt(input.options.maxApiRequests, "max API requests");
  const requestLimit = parsePositiveInt(input.options.apiBudget, "API budget");
  const queries = input.config.querySeeds.slice(0, requestCount);
  if (queries.length === 0) {
    throw new Error("No query seeds configured for live discovery.");
  }

  const usage = await readApiUsage(input.options.dataDir, "jooble", input.now, requestLimit);
  const remainingBeforeRun = remainingApiRequests(usage);
  if (input.options.dryRun) {
    return {
      sources: [],
      registry: createDefaultSourceRegistry(),
      dryRunMessage: [
        `Live Jooble discovery would make ${queries.length} API request(s).`,
        `Local budget remaining before run: ${remainingBeforeRun}/${requestLimit}.`,
        `Queries: ${queries.join(", ")}`,
      ].join("\n"),
    };
  }

  try {
    await reserveApiRequests({
      dataDir: input.options.dataDir,
      provider: "jooble",
      requestCount: queries.length,
      requestLimit,
      now: input.now,
      reason: `jobs discover --live (${queries.length} query seed(s))`,
    });
  } catch (error) {
    if (error instanceof ApiBudgetExceededError) {
      console.log(`${error.message}. Use --max-api-requests with a smaller value, inspect data/api-usage/jooble.json, or raise --api-budget intentionally.`);
    }
    throw error;
  }

  return {
    sources: queries.map((query, index) => ({
      schemaVersion: 1,
      id: `source_jooble_${index + 1}`,
      type: "broad_api",
      adapter: "jooble",
      name: `Jooble: ${query}`,
      reusable: true,
      enabled: true,
      credentialEnvVar: input.config.broadApiCredentialEnvVar,
      defaultQuery: query,
    })),
    registry: createDefaultSourceRegistry(),
  };
}

async function readSourceListings(dataDir: string, ids: string[]): Promise<SourceListingRecord[]> {
  const paths = createStoragePaths(dataDir);
  return Promise.all(
    ids.map((id) =>
      readJsonFile(path.join(paths.sourceListingsDir, `${id}.json`), SourceListingRecordSchema),
    ),
  );
}

async function createMockRegistry(mockSourceFile?: string) {
  const source: SourceRecord = {
    schemaVersion: 1,
    id: "source_mock",
    type: "manual",
    adapter: "manual",
    name: "Mock Source",
    reusable: true,
    enabled: true,
  };
  const candidates = mockSourceFile
    ? (JSON.parse(await readFile(mockSourceFile, "utf8")) as Array<{
        title: string;
        company: string;
        sourceUrl: string;
        location?: string;
        workType?: "remote" | "hybrid" | "onsite" | "unknown";
      }>)
    : [];
  const adapter: SourceAdapter = {
    id: "manual",
    async fetchCandidates(ctx) {
      return candidates.map(
        (candidate): SourceCandidate => ({
          source: ctx.source,
          sourceUrl: candidate.sourceUrl,
          metadata: {
            title: candidate.title,
            company: candidate.company,
            location: candidate.location,
            workType: candidate.workType,
          },
        }),
      );
    },
    async testSource() {
      return { ok: true, message: "ok" };
    },
  };

  return {
    sources: [source],
    registry: {
      enabledSources() {
        return [{ source, adapter }];
      },
    },
  };
}

function loadOptionalEnvFile(envFile: string): void {
  try {
    loadEnvFile(envFile);
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT") {
      return;
    }
    throw error;
  }
}

function parsePositiveInt(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${value}`);
  }
  return parsed;
}
