import { createHash } from "node:crypto";
import { normalizeUrl } from "../normalize/index.js";
import { confirmedUS, plainDescription, provisionalAssessment, referenceSet, type Assessment, type PrototypeCandidate, type PrototypeCard } from "./assessment.js";

export type Review = { fit: Assessment["fit"]; focus?: Assessment["focus"]; reason: string };
export function candidateId(url: string): string {
  return createHash("sha256").update(normalizeUrl(url)).digest("hex").slice(0, 20);
}
export function referenceReview(url: string): Review | undefined {
  const ref = referenceSet.find(ref => "url" in ref && ref.url && candidateId(ref.url) === candidateId(url));
  if (!ref) return undefined;
  return { fit: ref.label === "yes" || ref.label === "operations_builder" ? "builder" : ref.label === "no" ? "exclude" : ref.label === "maybe" ? "unclear" : ref.label === "engineering_first_blend" ? "engineering_blend" : "stretch",
    focus: "focus" in ref && ref.focus ? [...ref.focus] as Assessment["focus"] : [], reason: ref.reason };
}
export function prioritize(candidates: PrototypeCandidate[]): PrototypeCandidate[] {
  const unique = new Map<string, PrototypeCandidate>();
  for (const candidate of candidates) {
    const id = candidateId(candidate.url);
    if (!unique.has(id) || candidate.availability === "employer_feed") unique.set(id, candidate);
  }
  const rank = (c: PrototypeCandidate) => {
    const title = c.title.toLowerCase();
    const description = plainDescription(c.description);
    // Retrieval ranking only. The card stays "unclear" until reviewed or assessed.
    // Employer boilerplate often mentions building with AI on every posting, so
    // broad keyword presence alone cannot put an unrelated role at the top.
    const titleSignal = /product builder|ai builder|builder.*product|product.*builder/.test(title) ? 12
      : /product manager|head of product|director of product|product engineer/.test(title) ? 6 : 0;
    // An engineering or forward-deployed title can still describe a user-confirmed builder.
    const unrelatedTitle = /account executive|sales|recruit|data scientist|support specialist|marketing manager/.test(title) ? -8 : 0;
    const directBuild = /\b(?:you|your role)\b.{0,65}\b(?:build|ship|prototype)\b|\b(?:build|ship|prototype)\b.{0,60}\b(?:yourself|directly|using ai|with ai)\b|use ai tools to (?:build|ship)/i.test(description) ? 4 : 0;
    const productJudgment = /product judgment|product decisions|choose opportunities|identify.{0,40}(?:user|customer) problems|\b(?:own|shape) (?:a |the |our )?product\b/i.test(description) ? 4 : 0;
    const aiBuild = /Claude Code|Cursor|AI-assisted (?:coding|development)|AI tools to (?:build|ship)/i.test(description) ? 1 : 0;
    return (referenceReview(c.url) ? 30 : 0) + (confirmedUS(c.location) ? 2 : 0)
      + titleSignal + unrelatedTitle + directBuild + productJudgment + aiBuild;
  };
  return [...unique.values()].sort((a, b) => rank(b) - rank(a));
}
export function makeCard(candidate: PrototypeCandidate, assessment = provisionalAssessment(candidate.description), method = "provisional-extraction-v1", review?: Review): PrototypeCard {
  const { description, ...metadata } = candidate;
  const card: PrototypeCard = { ...metadata, id: candidateId(candidate.url), us: confirmedUS(candidate.location) ? "confirmed" : "unknown", assessment, method,
    ...(review ?? referenceReview(candidate.url) ? { review: review ?? referenceReview(candidate.url) } : {}) };
  // Never serialize a complete short posting accidentally through extracted passages.
  const full = plainDescription(description).replace(/\s+/g, " ");
  const stored = Object.values(card.assessment).flat().join(" ").replace(/\s+/g, " ");
  if (full && stored.includes(full)) {
    card.assessment = { ...assessment, fit: "unclear", evidence: [], qualifications: "Inspect employer posting for qualifications.", product: "Needs review.", operations: "Needs review.", building: "Needs review.", ai: "Needs review.", reason: "Short posting omitted to avoid storing a complete description." };
  }
  return card;
}
export function renderCard(card: PrototypeCard): string {
  return [
    `${card.company} — ${card.title}`,
    `Qualifications: ${card.assessment.qualifications}`,
    `Engineering requirement: ${card.assessment.engineering}`,
    `Fit: ${card.review?.fit ?? card.assessment.fit} (${card.review ? "user judgment" : card.method})`,
    `Focus: ${(card.review?.focus ?? card.assessment.focus ?? []).join(", ") || "unclear"}`,
    `Location: ${card.location || "unspecified"} | U.S. eligibility: ${card.us === "confirmed" ? "location confirmed; authorization not assessed" : "needs confirmation"}`,
    `Availability: ${card.availability} | checked ${card.checkedAt}`,
    `Product: ${card.assessment.product}`, `Operations: ${card.assessment.operations ?? "Needs review."}`, `Building: ${card.assessment.building}`, `AI: ${card.assessment.ai}`,
    `Why: ${card.review?.reason ?? card.assessment.reason}`, card.url,
  ].join("\n");
}
