import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createDefaultConfig } from "../config/index.js";
import { EventRecordSchema } from "../schemas/index.js";
import { createStoragePaths, readEvents } from "../storage/index.js";
import {
  JoobleAdapter,
  MissingSourceCredentialError,
  SourceFetchBatchError,
  fetchSourcesWithFailureHandling,
  type SourceAdapter,
} from "./index.js";

describe("source failure handling", () => {
  let tempDir: string | undefined;

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it("aborts missing broad API credentials unless partial sources are allowed", async () => {
    const adapter = new JoobleAdapter(async () => ({ jobs: [] }));
    const task = {
      adapter,
      ctx: {
        now: "2026-05-12T20:00:00.000Z",
        config: createDefaultConfig(),
        source: source("jooble", "broad_api"),
        limit: 10,
        env: {},
      },
    };

    await expect(
      fetchSourcesWithFailureHandling([task], { allowPartialSources: false }),
    ).rejects.toBeInstanceOf(MissingSourceCredentialError);

    await expect(
      fetchSourcesWithFailureHandling([task], { allowPartialSources: true }),
    ).rejects.toBeInstanceOf(SourceFetchBatchError);
  });

  it("writes source error details and continues when at least one source succeeds", async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), "jobs-ai-builder-source-failures-"));
    const now = "2026-05-12T20:00:00.000Z";
    const goodAdapter: SourceAdapter = {
      id: "manual",
      async fetchCandidates(ctx) {
        return [
          {
            source: ctx.source,
            sourceUrl: "https://example.com/jobs/1",
            metadata: { title: "AI Builder", company: "Example Co" },
          },
        ];
      },
      async testSource() {
        return { ok: true, message: "ok" };
      },
    };
    const rateLimitedAdapter: SourceAdapter = {
      id: "jooble",
      async fetchCandidates() {
        throw Object.assign(new Error("rate limited"), { status: 429 });
      },
      async testSource() {
        return { ok: false, message: "rate limited", rateLimited: true };
      },
    };

    const result = await fetchSourcesWithFailureHandling(
      [
        {
          adapter: rateLimitedAdapter,
          ctx: {
            now,
            config: createDefaultConfig(),
            source: source("jooble", "broad_api"),
            limit: 10,
          },
        },
        {
          adapter: goodAdapter,
          ctx: {
            now,
            config: createDefaultConfig(),
            source: source("manual", "manual"),
            limit: 10,
          },
        },
      ],
      {
        allowPartialSources: true,
        eventsFile: createStoragePaths(tempDir).eventsFile,
      },
    );

    expect(result.candidates).toHaveLength(1);
    expect(result.failures).toContainEqual(
      expect.objectContaining({ sourceId: "source_jooble", fetchStatus: "rate_limited" }),
    );
    const events = await readEvents(createStoragePaths(tempDir).eventsFile, EventRecordSchema);
    expect(events.events).toContainEqual(
      expect.objectContaining({
        type: "source.fetch.failed",
        sourceId: "source_jooble",
        payload: expect.objectContaining({ fetchStatus: "rate_limited" }),
      }),
    );
  });
});

function source(adapter: "jooble" | "manual", type: "broad_api" | "manual") {
  return {
    schemaVersion: 1 as const,
    id: `source_${adapter}`,
    type,
    adapter,
    name: adapter,
    reusable: true,
    enabled: true,
    credentialEnvVar: adapter === "jooble" ? "JOOBLE_API_KEY" : undefined,
  };
}
