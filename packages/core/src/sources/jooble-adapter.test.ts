import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDefaultConfig } from "../config/index.js";
import { JoobleAdapter } from "./index.js";

describe("Jooble adapter", () => {
  it("normalizes returned candidates into shared metadata", async () => {
    const requests: Array<{ url: string; init?: RequestInit }> = [];
    const adapter = new JoobleAdapter(async (url, init) => {
      requests.push({ url, init });
      return JSON.parse(
        await readFile(path.join(import.meta.dirname, "fixtures", "jooble-search.json"), "utf8"),
      );
    });
    const config = createDefaultConfig();
    const source = {
      schemaVersion: 1 as const,
      id: "source_jooble",
      type: "broad_api" as const,
      adapter: "jooble" as const,
      name: "Jooble",
      reusable: true,
      enabled: true,
      credentialEnvVar: "JOOBLE_API_KEY",
      defaultQuery: "AI Builder",
    };

    const candidates = await adapter.fetchCandidates({
      now: "2026-05-12T20:00:00.000Z",
      config,
      source,
      limit: 10,
      query: "AI Builder",
      env: { JOOBLE_API_KEY: "test-key" },
    });

    expect(requests[0]?.url).toBe("https://jooble.org/api/test-key");
    expect(JSON.stringify(requests)).not.toContain("data/config.json");
    expect(candidates[0]).toMatchObject({
      source,
      sourceUrl: "https://jooble.org/jdp/12345",
      externalId: "12345",
      metadata: {
        title: "AI Solutions Builder",
        company: "Impiricus",
        location: "Remote",
        workType: "remote",
        compensationRaw: "$165K - $210K",
        postedDate: "2026-05-03T12:00:00.000Z",
      },
      transientDescription: "Build AI coding workflows for customer teams.",
    });
  });
});
