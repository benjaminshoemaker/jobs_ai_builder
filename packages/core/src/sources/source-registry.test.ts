import { describe, expect, it } from "vitest";

import { ManualAdapter, SourceRegistry } from "./index.js";

describe("source registry", () => {
  it("selects enabled adapters and skips disabled sources", () => {
    const registry = new SourceRegistry([new ManualAdapter()]);
    const sources = [
      {
        schemaVersion: 1 as const,
        id: "enabled",
        type: "manual" as const,
        adapter: "manual" as const,
        name: "Enabled manual",
        reusable: true,
        enabled: true,
      },
      {
        schemaVersion: 1 as const,
        id: "disabled",
        type: "manual" as const,
        adapter: "manual" as const,
        name: "Disabled manual",
        reusable: true,
        enabled: false,
      },
    ];

    expect(registry.enabledSources(sources).map(({ source }) => source.id)).toEqual(["enabled"]);
    expect(registry.get("manual")).toBeInstanceOf(ManualAdapter);
  });
});
