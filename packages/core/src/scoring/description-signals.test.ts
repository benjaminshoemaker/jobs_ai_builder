import { describe, expect, it } from "vitest";

import { extractDescriptionSignals, scoreCandidate } from "./index.js";

describe("description signal extraction", () => {
  it("extracts review-time description signals without returning full text", () => {
    const transientDescription =
      "Use Claude Code and Cursor to orchestrate agentic workflows, lead product discovery, ship customer-facing features, and avoid pure ML research work.";

    const extraction = extractDescriptionSignals(transientDescription);

    expect(extraction.matches.map((match) => match.signal.id)).toEqual(
      expect.arrayContaining([
        "tool.claude_code",
        "tool.cursor",
        "agent.agentic_workflow",
        "product.product_discovery",
        "ownership.customer_facing_shipping",
        "exclude.ml_research",
      ]),
    );
    expect(JSON.stringify(extraction)).not.toContain(transientDescription);
    expect(extraction.sourceMetadata).toMatchObject({
      source: "description",
      persisted: false,
    });
  });

  it("feeds description-derived signals into the score result", () => {
    const score = scoreCandidate({
      title: "Product Builder",
      company: "Example Co",
      workType: "remote",
      transientDescription:
        "Build with Codex, Replit, and multi-agent LLM workflows from prototype to production.",
    });

    expect(score.positiveSignals.map((signal) => signal.id)).toEqual(
      expect.arrayContaining([
        "tool.codex",
        "tool.replit",
        "agent.agentic_workflow",
        "agent.llm_workflow",
        "product.prototype_to_production",
      ]),
    );
    expect(JSON.stringify(score)).not.toContain("Build with Codex");
  });
});
