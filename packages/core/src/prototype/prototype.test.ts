import { describe, expect, it, vi } from "vitest";
import { AssessmentSchema, assessWithAI, provisionalAssessment, confirmedUS, outsideUS, referenceSet, evidencePassages, plainDescription, type PrototypeCandidate } from "./assessment.js";
import { collectBoard } from "./collect.js";
import { makeCard, prioritize, referenceReview, renderCard } from "./workflow.js";

const candidate: PrototypeCandidate = {
  title: "Product Owner", company: "Example", url: "https://example.com/jobs/1", location: "United States",
  availability: "employer_feed", checkedAt: "2026-10-21T12:00:00.000Z",
  description: "Own discovery and prioritize customer problems.\nBuild software and agents using Claude Code.\nYou bring five years in product management and healthcare expertise.\nEngineering owns production architecture.",
};
const assessment = {
  fit: "product_builder", focus: ["product"], engineering: "explicit_non_swe_route", qualifications: "Five years PM; healthcare expertise.",
  product: "Owns discovery and priorities.", operations: "No operations focus.", building: "Personally builds software and agents.", ai: "Claude Code.", reason: "Product judgment and building are central.",
  evidence: ["Own discovery and prioritize customer problems.", "Build software and agents using Claude Code."],
} as const;
function aiResponse(value: unknown) {
  return { ok: true, json: async () => ({ status: "completed", output: [{ content: [{ type: "output_text", text: JSON.stringify(value) }] }] }) } as Response;
}

describe("qualifications-first prototype", () => {
  it("preserves all 54 explicit examples, including new builder focuses and a maybe", () => {
    expect(referenceSet).toHaveLength(54);
    const counts = referenceSet.reduce((acc, ref) => ({ ...acc, [ref.label]: (acc[ref.label] ?? 0) + 1 }), {} as Record<string, number>);
    expect(counts).toEqual({ yes: 31, no: 19, stretch: 1, engineering_first_blend: 1, operations_builder: 1, maybe: 1 });
    for (const id of ["alt", "sharkninja", "amperity", "within"]) expect(referenceSet.find(r => r.id === id)?.label).toBe("yes");
    expect(referenceReview("https://jobs.ashbyhq.com/g2/187a60bb-94fd-4127-bddd-a8c26ae6dec1")).toMatchObject({fit:"exclude"});
    expect(referenceReview("https://boards.greenhouse.io/figma/jobs/6235320004?gh_jid=6235320004")).toMatchObject({fit:"exclude"});
    const legion = referenceSet.find(r => r.id === "legion")!;
    expect(referenceReview(legion.url!)).toMatchObject({ fit: "exclude" });
    expect(referenceReview("https://jobs.ashbyhq.com/legionhealth/a-different-posting")).toBeUndefined();
    expect(referenceReview("https://jobs.ashbyhq.com/rillet/f8d4f207-1e14-49fc-a0aa-a997a0c9bc2c"))
      .toMatchObject({ fit: "builder", focus: ["operations"] });
    expect(referenceReview("https://job-boards.greenhouse.io/babylist/jobs/5831620004"))
      .toMatchObject({ fit: "builder", focus: ["design"] });
    expect(referenceReview("https://jobs.ashbyhq.com/faros-ai/f0978123-07f9-457e-9236-dc136ac1c0e7"))
      .toMatchObject({ fit: "builder", focus: ["product"] });
    expect(referenceReview("https://jobs.ashbyhq.com/sevenai/7ecab710-4008-4c7e-8518-c8b15bee95bf"))
      .toMatchObject({ fit: "unclear", focus: ["product"] });
    expect(referenceReview("https://jobs.ashbyhq.com/rillet/a182464e-76c1-4f0b-af78-76ba8a611281"))
      .toMatchObject({ fit: "exclude" });
  });
  it("accepts new focus areas without a new enum while rejecting malformed tags", () => {
    expect(AssessmentSchema.safeParse({ ...assessment, focus: ["design", "finance_operations"] }).success).toBe(true);
    expect(AssessmentSchema.safeParse({ ...assessment, focus: ["Design Focus"] }).success).toBe(false);
  });
  it("recognizes punctuated U.S. locations and separates explicit overseas from ambiguous remote", () => {
    expect(confirmedUS("Remote U.S.")).toBe(true);
    expect(confirmedUS("Remote - United States")).toBe(true);
    expect(outsideUS("Remote - Canada")).toBe(true);
    expect(outsideUS("London, UK; United States")).toBe(false);
    expect(outsideUS("Remote")).toBe(false);
    expect(confirmedUS("Remote")).toBe(false);
  });
  it("prefers a qualifications section to company introduction experience language", () => {
    const a = provisionalAssessment("We have an experienced team.\nYou will define requirements with engineering.\nWhat you bring\n9+ years in product management.\nYou have shipped tools using AI.");
    expect(a.qualifications).toContain("9+ years");
    expect(a.qualifications).not.toContain("experienced team");
    expect(a.qualifications).not.toContain("define requirements");
  });
  it("does not claim category fit or infer a SWE requirement from keyword matches", () => {
    expect(provisionalAssessment(candidate.description)).toMatchObject({ fit: "unclear", focus: [], engineering: "unclear" });
    expect(provisionalAssessment(candidate.description).qualifications).toContain("five years");
  });
  it("bounds excerpts independently from the longer qualifications summary", () => {
    const result = provisionalAssessment("Qualifications\n" + "You bring product experience and build tools with AI and healthcare expertise ".repeat(20));
    expect(result.qualifications.length).toBeGreaterThan(300);
    expect(AssessmentSchema.safeParse(result).success).toBe(true);
  });
  it("deduplicates tracked URLs, preferring employer verification, without title gating", () => {
    const result = prioritize([{ ...candidate, availability: "unverified", url: candidate.url + "?utm_source=search" }, candidate]);
    expect(result).toHaveLength(1);
    expect(result[0].availability).toBe("employer_feed");
    expect(result[0].title).toBe("Product Owner");
  });
  it("surfaces a builder posting above sales jobs carrying employer AI boilerplate", () => {
    const boilerplate = "Our company builds products with AI tools and Claude Code.";
    const sales = { ...candidate, title: "Account Executive", url: "https://example.com/sales",
      description: `${boilerplate} Apply discovery techniques to build customer relationships.` };
    const builder = { ...candidate, title: "Product Builder, AI Insights", url: "https://example.com/builder",
      description: `${boilerplate} You own a product area. Identify customer problems and use AI tools to build and ship internal products yourself.` };
    expect(prioritize([sales, builder])[0].url).toBe(builder.url);
    expect(provisionalAssessment(builder.description).fit).toBe("unclear");
  });
  it("does not demote an unseen builder solely for a forward-deployed or engineering title", () => {
    const description = "You build working software with AI for mission users and carry their needs into the product roadmap.";
    const forwardDeployed = { ...candidate, title: "Forward Deployed Engineer", url: "https://example.com/forward", description };
    const engineer = { ...candidate, title: "Software Engineer", url: "https://example.com/engineer", description };
    const neutral = { ...candidate, title: "Technical Specialist", url: "https://example.com/neutral", description };
    expect(prioritize([forwardDeployed, engineer, neutral]).map(role => role.url))
      .toEqual([forwardDeployed.url, engineer.url, neutral.url]);
  });
  it("shows qualifications first, keeps fit separate, honors corrections, and never serializes descriptions", () => {
    const card = makeCard(candidate, { ...assessment, focus: [...assessment.focus], evidence: [...assessment.evidence] }, "test-model", { fit: "exclude", reason: "Overall traditional PM." });
    const rendered = renderCard(card);
    expect(rendered.indexOf("Qualifications:")).toBeLessThan(rendered.indexOf("Fit:"));
    expect(rendered).toContain("Fit: exclude (user judgment)");
    expect(rendered).toContain("Focus: product");
    expect(card).not.toHaveProperty("description");
    expect(JSON.stringify(card)).not.toContain("Engineering owns production architecture.");
    expect(JSON.stringify(makeCard({ ...candidate, description: "Build software using AI." }))).not.toContain("Build software using AI.");
  });
  it("collects only explicitly listed Ashby postings and retains location/date", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ jobs: [
      { title: "PM", jobUrl: candidate.url, descriptionPlain: candidate.description, isListed: true, location: "United States", publishedAt: "2026-10-01" },
      { title: "Hidden", jobUrl: "https://example.com/hidden", isListed: false },
      { title: "Unspecified", jobUrl: "https://example.com/unknown" },
    ] }) });
    const jobs = await collectBoard("ashby:example", candidate.checkedAt, fetcher);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]).toMatchObject({ location: "United States", postedAt: "2026-10-01", availability: "employer_feed" });
    await expect(collectBoard("ashby:example", candidate.checkedAt, vi.fn().mockResolvedValue({ ok: false, status: 429 }))).rejects.toThrow("availability unknown");
  });
  it("accepts a real dotted Ashby board name", async () => {
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({jobs:[]})});
    await expect(collectBoard("ashby:within.ai",candidate.checkedAt,fetcher)).resolves.toEqual([]);
    expect(fetcher.mock.calls[0][0]).toBe("https://api.ashbyhq.com/posting-api/job-board/within.ai");
  });
  it("uses Greenhouse first publication time rather than the update time", async () => {
    const fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({jobs:[{id:1,title:"Builder",absolute_url:candidate.url,location:{name:"United States"},content:"Description",first_published:"2026-10-01",updated_at:"2026-10-28"}]})});
    expect((await collectBoard("greenhouse:example",candidate.checkedAt,fetcher))[0].postedAt).toBe("2026-10-01");
    const noPublication=vi.fn().mockResolvedValue({ok:true,json:async()=>({jobs:[{title:"Builder",absolute_url:candidate.url,updated_at:"2026-10-28"}]})});
    expect((await collectBoard("greenhouse:example",candidate.checkedAt,noPublication))[0].postedAt).toBeUndefined();
  });
  it("includes Lever qualifications lists, not just overview text", async () => {
    const jobs = await collectBoard("lever:example", candidate.checkedAt, vi.fn().mockResolvedValue({ ok: true, json: async () => [{
      text: "PM", hostedUrl: candidate.url, descriptionPlain: "About us.", lists: [{ text: "Qualifications", content: "<li>5 years PM</li>" }], categories: { location: "United States" },
    }] }));
    expect(jobs[0].description).toContain("5 years PM");
  });
  it("sends all references, disables API storage, and validates positive evidence", async () => {
    const fetcher = vi.fn().mockResolvedValue(aiResponse(assessment));
    await expect(assessWithAI(candidate, { model: "test-model", apiKey: "secret", fetchImpl: fetcher })).resolves.toMatchObject({ fit: "product_builder" });
    const body = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(body.store).toBe(false);
    expect(body.instructions).toContain("Legion");
    expect(body.instructions).toContain("SharkNinja");
    expect(body.instructions).toContain("Do not treat technical fluency");
    expect(body.text.format.type).toBe("json_schema");
    expect(body.text.format.schema.properties.evidence.items.maxLength).toBe(300);
    expect(body.text.format.schema.properties.qualifications.maxLength).toBe(700);
    await assessWithAI(candidate,{model:'test-model',apiKey:'secret',fetchImpl:fetcher,referenceContext:'{"version":"feedback-example","labels":["corrected negative"]}'});
    expect(JSON.parse(fetcher.mock.calls[1][1].body).instructions).toContain('feedback-example');
    await assessWithAI(candidate,{model:'test-model',apiKey:'secret',fetchImpl:fetcher,eligibilityInstructions:'Require AI as a material building tool'});
    expect(JSON.parse(fetcher.mock.calls[2][1].body).instructions).toContain('Require AI as a material building tool');
    await expect(assessWithAI(candidate, { model: "test", apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(aiResponse({ ...assessment, evidence: ["invented quote that is sufficiently long to test"] })) })).rejects.toThrow("exact passage");
    await expect(assessWithAI(candidate, { model: "test", apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(aiResponse({ ...assessment, evidence: [] })) })).rejects.toThrow("separate ownership/building");
    await expect(assessWithAI(candidate, { model: "test", apiKey: "secret", fetchImpl: vi.fn().mockResolvedValue(aiResponse({ ...assessment, fit: "operations_builder", focus: ["product"] })) })).rejects.toThrow("focus contradicts fit");
  });
  it('resolves selected passage IDs to exact source text without generated quotes',async()=>{
    const description=plainDescription(candidate.description),passages=evidencePassages(description);
    expect(passages.map(p=>p.text).join('')).toBe(description);
    expect(passages.every(p=>p.text.length>=30&&p.text.length<=300&&p.text===description.slice(p.start,p.end))).toBe(true);
    const fetcher=vi.fn().mockResolvedValue(aiResponse({...assessment,evidence:[passages[0].id,passages[1].id]}));
    const result=await assessWithAI(candidate,{model:'test',apiKey:'secret',evidenceMode:'passage_ids',fetchImpl:fetcher});
    expect(result.evidence).toEqual([passages[0].text,passages[1].text]);
    const body=JSON.parse(fetcher.mock.calls[0][1].body),input=JSON.parse(body.input);
    expect(input.description).toBeUndefined();expect(input.passages[0]).toEqual({id:passages[0].id,text:passages[0].text});
    expect(body.text.format.schema.properties.evidence.items.enum).toEqual(passages.map(p=>p.id));
    expect(body.text.format.schema.properties.fit.enum).toEqual(['builder','exclude','unclear','stretch']);
    expect(result.fit).toBe('builder');
    const compatible=await assessWithAI(candidate,{model:'test',apiKey:'secret',evidenceMode:'passage_ids',fetchImpl:vi.fn().mockResolvedValue(aiResponse({...assessment,fit:'engineering_builder',focus:['operations','data_platform'],evidence:[passages[0].id,passages[1].id]}))});
    expect(compatible).toMatchObject({fit:'builder',focus:['operations','data_platform']});
    for(const evidence of [['p9999'],[passages[0].id,passages[0].id]])await expect(assessWithAI(candidate,{model:'test',apiKey:'secret',evidenceMode:'passage_ids',fetchImpl:vi.fn().mockResolvedValue(aiResponse({...assessment,evidence}))})).rejects.toThrow(/passage IDs?/);
    await expect(assessWithAI(candidate,{model:'test',apiKey:'secret',evidenceMode:'passage_ids',fetchImpl:vi.fn().mockResolvedValue(aiResponse({...assessment,evidence:[passages[0].id]}))})).rejects.toThrow('separate ownership/building');
  });
  it('preserves every character and bounded original spans through long and encoded postings',()=>{
    const source=plainDescription('<p>Own the customer’s problem &amp; build a useful tool.\n'+('Use AI to build and ship real features. '.repeat(100))+'</p>');
    const passages=evidencePassages(source);expect(passages.map(p=>p.text).join('')).toBe(source);
    expect(new Set(passages.map(p=>p.id)).size).toBe(passages.length);
    expect(passages.every(p=>p.text.length>=30&&p.text.length<=300&&source.includes(p.text))).toBe(true);
    expect(evidencePassages('too short')).toEqual([]);
  });
});
