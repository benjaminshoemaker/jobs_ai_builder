import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { createDefaultConfig } from "../config/index.js";
import {
  AshbyAdapter,
  GreenhouseAdapter,
  LeverAdapter,
  type HttpJsonFetcher,
} from "./index.js";

const now = "2026-05-12T20:00:00.000Z";

describe("ATS adapters", () => {
  it("normalizes Ashby, Greenhouse, and Lever fixture payloads", async () => {
    const cases = [
      {
        adapter: new AshbyAdapter(fakeFetcher("ashby-board.json")),
        source: source("ashby", "Example Ashby"),
        expected: {
          title: "Builder in Residence",
          location: "Remote",
          postedDate: "2026-05-01T12:00:00.000Z",
          sourceUrl: "https://jobs.ashbyhq.com/example/ashby_1",
          externalId: "ashby_1",
        },
      },
      {
        adapter: new GreenhouseAdapter(fakeFetcher("greenhouse-board.json")),
        source: source("greenhouse", "Example Greenhouse"),
        expected: {
          title: "Senior Product Builder",
          location: "New York, NY",
          postedDate: "2026-05-02T12:00:00Z",
          sourceUrl: "https://boards.greenhouse.io/example/jobs/5153099008",
          externalId: "5153099008",
        },
      },
      {
        adapter: new LeverAdapter(fakeFetcher("lever-postings.json")),
        source: source("lever", "Example Lever"),
        expected: {
          title: "AI Product Engineer",
          location: "San Francisco, CA",
          postedDate: "2026-05-01T16:00:00.000Z",
          sourceUrl: "https://jobs.lever.co/example/lever_1",
          externalId: "lever_1",
        },
      },
    ];

    for (const testCase of cases) {
      const candidates = await testCase.adapter.fetchCandidates({
        now,
        config: createDefaultConfig(),
        source: testCase.source,
        limit: 10,
      });

      expect(candidates[0]).toMatchObject({
        source: testCase.source,
        sourceUrl: testCase.expected.sourceUrl,
        externalId: testCase.expected.externalId,
        metadata: {
          title: testCase.expected.title,
          company: testCase.source.name,
          location: testCase.expected.location,
          postedDate: testCase.expected.postedDate,
        },
      });
    }
  });

  it("handles unavailable, rate-limited, and malformed payloads without throwing", async () => {
    const unavailable = new GreenhouseAdapter(async () => {
      throw Object.assign(new Error("not found"), { status: 404 });
    });
    const rateLimited = new LeverAdapter(async () => {
      throw Object.assign(new Error("rate limited"), { status: 429 });
    });
    const malformed = new AshbyAdapter(async () => ({ nope: true }));

    await expect(fetchFrom(unavailable, "greenhouse")).resolves.toEqual([]);
    await expect(fetchFrom(rateLimited, "lever")).resolves.toEqual([]);
    await expect(fetchFrom(malformed, "ashby")).resolves.toEqual([]);
    await expect(rateLimited.testSource(source("lever", "Example Lever"))).resolves.toMatchObject({
      ok: false,
      rateLimited: true,
    });
  });
});

function source(adapter: "ashby" | "greenhouse" | "lever", name: string) {
  return {
    schemaVersion: 1 as const,
    id: `source_${adapter}`,
    type: "ats" as const,
    adapter,
    name,
    reusable: true,
    companySlug: "example",
    enabled: true,
  };
}

async function fetchFrom(adapter: AshbyAdapter | GreenhouseAdapter | LeverAdapter, adapterId: "ashby" | "greenhouse" | "lever") {
  return adapter.fetchCandidates({
    now,
    config: createDefaultConfig(),
    source: source(adapterId, "Example"),
    limit: 10,
  });
}

function fakeFetcher(fileName: string): HttpJsonFetcher {
  return async () =>
    JSON.parse(
      await readFile(path.join(import.meta.dirname, "fixtures", fileName), "utf8"),
    );
}
