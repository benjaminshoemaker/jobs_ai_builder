import { describe, expect, it } from "vitest";

import { createDefaultConfig } from "../config/index.js";
import { evaluatePreferences } from "./index.js";

describe("preference evaluation", () => {
  it("hard filters only clear work type violations", () => {
    const config = {
      ...createDefaultConfig(),
      preferences: {
        workType: { value: ["remote" as const], mode: "hard_filter" as const },
      },
    };

    expect(evaluatePreferences({ title: "AI Builder", company: "A", workType: "onsite" }, config))
      .toMatchObject({ filtered: true });
    expect(evaluatePreferences({ title: "AI Builder", company: "A", workType: "unknown" }, config))
      .toMatchObject({ filtered: false });
  });

  it("soft rank changes preference points without filtering", () => {
    const config = {
      ...createDefaultConfig(),
      preferences: {
        workType: { value: ["remote" as const], mode: "soft_rank" as const },
      },
    };

    const match = evaluatePreferences(
      { title: "AI Builder", company: "A", workType: "remote" },
      config,
    );
    const mismatch = evaluatePreferences(
      { title: "AI Builder", company: "A", workType: "onsite" },
      config,
    );

    expect(match.filtered).toBe(false);
    expect(mismatch.filtered).toBe(false);
    expect(match.points).toBeGreaterThan(0);
    expect(mismatch.points).toBeLessThan(0);
  });

  it("note-only preferences create neutral notes without changing score or filtering", () => {
    const config = {
      ...createDefaultConfig(),
      preferences: {
        compensationFloor: { value: 175000, mode: "note_only" as const },
      },
    };

    const evaluation = evaluatePreferences(
      {
        title: "AI Builder",
        company: "A",
        workType: "remote",
        compensationMax: 140000,
      },
      config,
    );

    expect(evaluation.filtered).toBe(false);
    expect(evaluation.points).toBe(0);
    expect(evaluation.signals).toContainEqual(
      expect.objectContaining({
        id: "preference.compensation_below_floor",
        polarity: "neutral",
      }),
    );
  });
});
