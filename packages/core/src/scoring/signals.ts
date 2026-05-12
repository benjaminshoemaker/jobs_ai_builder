import type { ScoringRulesRecord } from "../schemas/index.js";
import type { ScoringCandidate } from "./types.js";

type BucketName =
  | "title"
  | "ai_tools"
  | "product_build"
  | "agent_llm"
  | "production_ownership"
  | "exclusion"
  | "source_quality";

export type SignalRule = {
  id: string;
  label: string;
  bucket: BucketName;
  source: "title" | "metadata" | "description" | "source";
  polarity: "positive" | "negative" | "neutral";
  defaultWeight: number;
  patterns: RegExp[];
  fields: Array<keyof Pick<ScoringCandidate, "title" | "company" | "transientDescription">>;
};

export const SIGNAL_RULES: SignalRule[] = [
  {
    id: "title.ai_builder",
    label: "AI Builder title",
    bucket: "title",
    source: "title",
    polarity: "positive",
    defaultWeight: 25,
    patterns: [/\bAI Builder\b/i],
    fields: ["title"],
  },
  {
    id: "title.ai_product_engineer",
    label: "AI Product Engineer title",
    bucket: "title",
    source: "title",
    polarity: "positive",
    defaultWeight: 24,
    patterns: [/\bAI Product Engineer\b/i],
    fields: ["title"],
  },
  {
    id: "title.product_builder",
    label: "Product Builder title",
    bucket: "title",
    source: "title",
    polarity: "positive",
    defaultWeight: 24,
    patterns: [/\bProduct Builder\b/i],
    fields: ["title"],
  },
  {
    id: "title.builder_in_residence",
    label: "Builder in Residence title",
    bucket: "title",
    source: "title",
    polarity: "positive",
    defaultWeight: 22,
    patterns: [/\bBuilder in Residence\b/i],
    fields: ["title"],
  },
  {
    id: "title.ai_solutions_builder",
    label: "AI Solutions Builder title",
    bucket: "title",
    source: "title",
    polarity: "positive",
    defaultWeight: 22,
    patterns: [/\bAI Solutions Builder\b/i],
    fields: ["title"],
  },
  {
    id: "title.founding_product_engineer",
    label: "Founding Product Engineer title",
    bucket: "title",
    source: "title",
    polarity: "positive",
    defaultWeight: 16,
    patterns: [/\bFounding Product Engineer\b/i],
    fields: ["title"],
  },
  {
    id: "tool.claude_code",
    label: "Claude Code mentioned",
    bucket: "ai_tools",
    source: "description",
    polarity: "positive",
    defaultWeight: 8,
    patterns: [/\bClaude Code\b/i],
    fields: ["title", "transientDescription"],
  },
  {
    id: "tool.cursor",
    label: "Cursor mentioned",
    bucket: "ai_tools",
    source: "description",
    polarity: "positive",
    defaultWeight: 7,
    patterns: [/\bCursor\b/i],
    fields: ["title", "transientDescription"],
  },
  {
    id: "tool.codex",
    label: "Codex mentioned",
    bucket: "ai_tools",
    source: "description",
    polarity: "positive",
    defaultWeight: 7,
    patterns: [/\bCodex\b/i],
    fields: ["title", "transientDescription"],
  },
  {
    id: "tool.lovable",
    label: "Lovable mentioned",
    bucket: "ai_tools",
    source: "description",
    polarity: "positive",
    defaultWeight: 6,
    patterns: [/\bLovable\b/i],
    fields: ["title", "transientDescription"],
  },
  {
    id: "tool.replit",
    label: "Replit mentioned",
    bucket: "ai_tools",
    source: "description",
    polarity: "positive",
    defaultWeight: 6,
    patterns: [/\bReplit\b/i],
    fields: ["title", "transientDescription"],
  },
  {
    id: "tool.mcp",
    label: "MCP mentioned",
    bucket: "ai_tools",
    source: "description",
    polarity: "positive",
    defaultWeight: 5,
    patterns: [/\bMCP\b/i],
    fields: ["transientDescription"],
  },
  {
    id: "product.product_discovery",
    label: "Product discovery ownership",
    bucket: "product_build",
    source: "description",
    polarity: "positive",
    defaultWeight: 7,
    patterns: [/\bproduct discovery\b/i, /\bcustomer workflows?\b/i],
    fields: ["transientDescription"],
  },
  {
    id: "product.prototype_to_production",
    label: "Prototype to production",
    bucket: "product_build",
    source: "description",
    polarity: "positive",
    defaultWeight: 8,
    patterns: [/\bprototype(?:s)? to production\b/i, /\bMVP(?:s)?\b/i],
    fields: ["transientDescription"],
  },
  {
    id: "agent.agentic_workflow",
    label: "Agentic workflow",
    bucket: "agent_llm",
    source: "description",
    polarity: "positive",
    defaultWeight: 8,
    patterns: [/\bagentic workflows?\b/i, /\borchestrate agents?\b/i, /\bmulti-agent\b/i],
    fields: ["transientDescription"],
  },
  {
    id: "agent.llm_workflow",
    label: "LLM workflow",
    bucket: "agent_llm",
    source: "description",
    polarity: "positive",
    defaultWeight: 6,
    patterns: [/\bLLM workflows?\b/i, /\bRAG\b/i],
    fields: ["transientDescription"],
  },
  {
    id: "ownership.customer_facing_shipping",
    label: "Customer-facing shipping ownership",
    bucket: "production_ownership",
    source: "description",
    polarity: "positive",
    defaultWeight: 6,
    patterns: [/\bcustomer-facing\b/i, /\bship(?:ping)?\b/i],
    fields: ["transientDescription"],
  },
  {
    id: "ownership.internal_tools",
    label: "Internal tools ownership",
    bucket: "production_ownership",
    source: "description",
    polarity: "positive",
    defaultWeight: 4,
    patterns: [/\binternal tools?\b/i],
    fields: ["transientDescription"],
  },
  {
    id: "exclude.ml_research",
    label: "ML research focus",
    bucket: "exclusion",
    source: "description",
    polarity: "negative",
    defaultWeight: -18,
    patterns: [/\bML research\b/i, /\bmachine learning researcher\b/i, /\bmodel training\b/i],
    fields: ["title", "transientDescription"],
  },
  {
    id: "exclude.devrel",
    label: "DevRel or evangelism focus",
    bucket: "exclusion",
    source: "metadata",
    polarity: "negative",
    defaultWeight: -14,
    patterns: [/\bDevRel\b/i, /\bdeveloper relations\b/i, /\bevangelis[mt]\b/i],
    fields: ["title", "transientDescription"],
  },
  {
    id: "exclude.prompt_content",
    label: "Prompt or content role",
    bucket: "exclusion",
    source: "metadata",
    polarity: "negative",
    defaultWeight: -18,
    patterns: [/\bprompt writer\b/i, /\bcontent writer\b/i, /\bAI content\b/i],
    fields: ["title", "transientDescription"],
  },
  {
    id: "exclude.generic_automation",
    label: "Generic automation role",
    bucket: "exclusion",
    source: "metadata",
    polarity: "negative",
    defaultWeight: -12,
    patterns: [/\bautomation specialist\b/i, /\bworkflow automation\b/i],
    fields: ["title", "transientDescription"],
  },
];

export function detectRuleSignals(
  candidate: ScoringCandidate,
  scoringRules: ScoringRulesRecord,
) {
  return SIGNAL_RULES.flatMap((rule) => {
    const matched = rule.fields.some((field) => {
      const value = candidate[field];
      return typeof value === "string" && rule.patterns.some((pattern) => pattern.test(value));
    });

    if (!matched) {
      return [];
    }

    return [
      {
        bucket: rule.bucket,
        signal: {
          id: rule.id,
          label: rule.label,
          polarity: rule.polarity,
          source: rule.source,
          weight: scoringRules.signalWeights[rule.id] ?? rule.defaultWeight,
        },
      },
    ];
  });
}

export function detectSourceQualitySignal(candidate: ScoringCandidate) {
  if (candidate.sourceType === "ats") {
    return {
      bucket: "source_quality" as const,
      signal: {
        id: "source.ats_company_board",
        label: "Company ATS source",
        polarity: "positive" as const,
        source: "source" as const,
        weight: 3,
      },
    };
  }

  if (candidate.sourceType === "broad_api") {
    return {
      bucket: "source_quality" as const,
      signal: {
        id: "source.broad_api",
        label: "Broad jobs API source",
        polarity: "positive" as const,
        source: "source" as const,
        weight: 1,
      },
    };
  }

  return undefined;
}
