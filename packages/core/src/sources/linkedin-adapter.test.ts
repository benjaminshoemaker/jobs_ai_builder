import { describe, expect, it } from "vitest";

import { createDefaultConfig } from "../config/index.js";
import { LinkedInManualAdapter } from "./index.js";

describe("LinkedIn no-fetch adapter", () => {
  it("uses no-fetch behavior and prompt-compatible minimal metadata", async () => {
    const adapter = new LinkedInManualAdapter();
    const source = {
      schemaVersion: 1 as const,
      id: "source_linkedin",
      type: "linkedin" as const,
      adapter: "linkedin" as const,
      name: "LinkedIn",
      reusable: false,
      enabled: true,
    };

    const candidate = await adapter.fetchByUrl?.("https://www.linkedin.com/jobs/view/4412317108/", {
      now: "2026-05-12T20:00:00.000Z",
      config: createDefaultConfig(),
      source,
      limit: 1,
    });

    expect(candidate).toMatchObject({
      source,
      sourceUrl: "https://www.linkedin.com/jobs/view/4412317108/",
      fetchStatus: "no_fetch",
      metadata: {
        title: "Unknown LinkedIn role",
        company: "Unknown company",
      },
      sourceSignal: {
        adapter: "linkedin",
        fetchPolicy: "no_fetch",
      },
    });
  });
});
