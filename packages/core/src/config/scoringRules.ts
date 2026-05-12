import {
  ScoringRulesRecordSchema,
  type ScoringRulesRecord,
} from "../schemas/index.js";

export const DEFAULT_SCORING_VERSION = "rules-v1";

export function createDefaultScoringRules(
  updatedAt = new Date().toISOString(),
): ScoringRulesRecord {
  return ScoringRulesRecordSchema.parse({
    schemaVersion: 1,
    scoringVersion: DEFAULT_SCORING_VERSION,
    updatedAt,
    bucketMaxPoints: {
      title: 25,
      ai_tools: 20,
      product_build: 20,
      agent_llm: 15,
      production_ownership: 10,
      exclusion: 50,
      preferences: 10,
      source_quality: 5,
    },
    signalWeights: {
      "title.ai_builder": 25,
      "title.ai_product_engineer": 24,
      "title.product_builder": 24,
      "title.builder_in_residence": 22,
      "title.ai_solutions_builder": 22,
      "title.founding_product_engineer": 16,
      "tool.claude_code": 8,
      "tool.cursor": 7,
      "tool.codex": 7,
      "tool.lovable": 6,
      "tool.replit": 6,
      "tool.mcp": 5,
      "product.product_discovery": 7,
      "product.customer_workflows": 6,
      "product.prototype_to_production": 8,
      "agent.agent_orchestration": 8,
      "agent.multi_agent": 7,
      "ownership.customer_facing_shipping": 6,
      "ownership.internal_tools": 4,
      "source.ats_company_board": 3,
      "source.broad_api": 1,
    },
    exclusionPatterns: [
      {
        id: "exclude.ml_research",
        label: "ML research focus",
        pattern: "\\b(machine learning researcher|model training|research scientist)\\b",
        matchField: "description",
      },
      {
        id: "exclude.devrel",
        label: "DevRel or evangelism focus",
        pattern: "\\b(devrel|developer relations|evangelist)\\b",
        matchField: "title",
      },
      {
        id: "exclude.prompt_content",
        label: "Prompt or content role",
        pattern: "\\b(prompt writer|content writer|ai content)\\b",
        matchField: "title",
      },
      {
        id: "exclude.generic_automation",
        label: "Generic automation role",
        pattern: "\\b(automation specialist|workflow automation)\\b",
        matchField: "title",
      },
    ],
  });
}
