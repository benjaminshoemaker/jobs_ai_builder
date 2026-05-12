import { describe, expect, it } from "vitest";

import { createDefaultConfig } from "../config/index.js";
import { ManualAdapter } from "./index.js";

describe("manual source adapter", () => {
  it("converts URL plus entered metadata into a source candidate and reusable source signal", async () => {
    const adapter = new ManualAdapter();
    const source = {
      schemaVersion: 1 as const,
      id: "source_manual",
      type: "manual" as const,
      adapter: "manual" as const,
      name: "Manual adds",
      reusable: true,
      enabled: true,
    };

    const candidate = await adapter.fetchByUrl?.("https://example.com/jobs/ai-builder", {
      now: "2026-05-12T20:00:00.000Z",
      config: createDefaultConfig(),
      source,
      limit: 1,
      manualMetadata: {
        title: "AI Builder",
        company: "Example Co",
        location: "Remote",
        workType: "remote",
      },
      reusable: true,
    });

    expect(candidate).toMatchObject({
      source,
      sourceUrl: "https://example.com/jobs/ai-builder",
      metadata: {
        title: "AI Builder",
        company: "Example Co",
        workType: "remote",
      },
      sourceSignal: {
        adapter: "manual",
        reusable: true,
      },
    });
  });
});
