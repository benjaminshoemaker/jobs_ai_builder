import { describe, expect, it } from "vitest";

import { createDefaultConfig, createDefaultScoringRules } from "../config/index.js";
import { ScoreResultSchema } from "../schemas/index.js";
import { scoreCandidate } from "./index.js";

describe("rules-based scoring", () => {
  it("returns score results with positive title, tool, product, agent, ownership, and source signals", () => {
    const score = scoreCandidate({
      title: "Senior AI Builder",
      company: "Example Co",
      workType: "remote",
      sourceType: "ats",
      transientDescription:
        "Use Claude Code and Cursor to orchestrate agentic workflows, own product discovery, and ship customer-facing features from prototype to production.",
    });

    expect(ScoreResultSchema.safeParse(score).success).toBe(true);
    expect(score.total).toBeGreaterThanOrEqual(70);
    expect(score.scoringVersion).toBe("rules-v1");
    expect(score.surfacedReason).toContain("AI Builder title");
    expect(score.positiveSignals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining([
        "title.ai_builder",
        "tool.claude_code",
        "product.product_discovery",
        "agent.agentic_workflow",
        "ownership.customer_facing_shipping",
        "source.ats_company_board",
      ]),
    );
  });

  it("adds negative exclusion signals for adjacent roles outside the AI Builder scope", () => {
    const score = scoreCandidate({
      title: "AI Content Writer",
      company: "Example Co",
      workType: "remote",
      transientDescription: "Create prompt templates and AI content for marketing campaigns.",
    });

    expect(score.negativeSignals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining(["exclude.prompt_content"]),
    );
    expect(score.buckets.find((bucket) => bucket.name === "exclusion")?.points).toBeLessThan(0);
  });

  it("clamps totals to 0 through 100", () => {
    const rules = createDefaultScoringRules("2026-05-12T20:00:00.000Z");

    const highScore = scoreCandidate(
      {
        title: "AI Builder Product Builder AI Solutions Builder",
        company: "Example Co",
        workType: "remote",
        sourceType: "ats",
        transientDescription:
          "Claude Code Cursor Codex Lovable Replit MCP multi-agent LLM workflow product discovery customer-facing prototype to production internal tools shipping ownership",
      },
      {
        scoringRules: {
          ...rules,
          bucketMaxPoints: Object.fromEntries(
            Object.keys(rules.bucketMaxPoints).map((bucket) => [bucket, 100]),
          ) as typeof rules.bucketMaxPoints,
          signalWeights: Object.fromEntries(
            Object.entries(rules.signalWeights).map(([id]) => [id, 100]),
          ),
        },
      },
    );

    const lowScore = scoreCandidate({
      title: "Prompt Writer",
      company: "Example Co",
      workType: "remote",
      transientDescription:
        "Prompt writer content role focused on ML research, model training, DevRel, evangelism, and generic workflow automation.",
    });

    expect(highScore.total).toBe(100);
    expect(lowScore.total).toBeGreaterThanOrEqual(0);
  });

  it("uses configured scoring versions and app preferences", () => {
    const config = {
      ...createDefaultConfig(),
      preferences: {
        workType: { value: ["remote" as const], mode: "soft_rank" as const },
      },
    };

    const score = scoreCandidate(
      {
        title: "Product Builder",
        company: "Example Co",
        workType: "onsite",
      },
      { config },
    );

    expect(score.scoringVersion).toBe("rules-v1");
    expect(score.negativeSignals.map((signal) => signal.id)).toContain(
      "preference.work_type_mismatch",
    );
  });
});
