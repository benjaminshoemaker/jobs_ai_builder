import { z } from "zod";
import { createDefaultConfig } from "../config/index.js";
import { JoobleAdapter } from "../sources/joobleAdapter.js";
import type { PrototypeCandidate } from "./assessment.js";

export const BoardSchema = z.string().regex(/^(ashby|greenhouse|lever):[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*$/);
export type Board = z.infer<typeof BoardSchema>;

export async function collectBoard(board: Board, checkedAt: string, fetchImpl: typeof fetch = fetch): Promise<PrototypeCandidate[]> {
  BoardSchema.parse(board);
  const [provider, slug] = board.split(":");
  const endpoint = provider === "ashby" ? `https://api.ashbyhq.com/posting-api/job-board/${slug}`
    : provider === "greenhouse" ? `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`
    : `https://api.lever.co/v0/postings/${slug}?mode=json`;
  const response = await fetchImpl(endpoint, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok) throw new Error(`${board}: HTTP ${response.status} (availability unknown)`);
  const payload = await response.json();
  const jobs: unknown[] = provider === "lever" ? z.array(z.unknown()).parse(payload)
    : z.object({ jobs: z.array(z.unknown()) }).parse(payload).jobs;
  return jobs.flatMap(raw => {
    const job = z.record(z.unknown()).parse(raw);
    if (provider === "ashby" && job.isListed !== true) return [];
    const str = (key: string) => typeof job[key] === "string" ? job[key] as string : "";
    const categories = z.object({ location: z.string().optional(), allLocations: z.array(z.string()).optional() }).passthrough().safeParse(job.categories);
    const ghLocation = z.object({ name: z.string().optional() }).safeParse(job.location);
    const location = provider === "ashby" ? [str("location"), ...((Array.isArray(job.secondaryLocations) ? job.secondaryLocations : []) as { location?: string }[]).map(x => x.location ?? "")].filter(Boolean).join("; ")
      : provider === "greenhouse" ? (ghLocation.success ? ghLocation.data.name ?? "" : "")
      : categories.success ? [categories.data.location, ...(categories.data.allLocations ?? [])].filter(Boolean).join("; ") : "";
    const title = str(provider === "lever" ? "text" : "title");
    const url = str(provider === "ashby" ? "jobUrl" : provider === "greenhouse" ? "absolute_url" : "hostedUrl");
    if (!title || !z.string().url().safeParse(url).success) return [];
    const lists = Array.isArray(job.lists) ? job.lists as { text?: string; content?: string }[] : [];
    const description = provider === "greenhouse" ? str("content") : provider === "lever"
      ? [str("descriptionPlain"), ...lists.map(x => `${x.text ?? ""}\n${x.content ?? ""}`), str("additionalPlain")].join("\n") : str("descriptionPlain");
    return [{ title, company: slug!, url, location, description, availability: "employer_feed" as const, checkedAt,
      postedAt: str(provider === "ashby" ? "publishedAt" : "first_published") || undefined }];
  });
}

export async function collectJooble(query: string, checkedAt: string, limit: number): Promise<PrototypeCandidate[]> {
  const adapter = new JoobleAdapter(async (url, init) => {
    const body = JSON.parse(init?.body as string);
    const response = await fetch(url, { ...init, body: JSON.stringify({ ...body, location: "United States" }), signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Jooble HTTP ${response.status}`);
    return response.json();
  });
  const candidates = await adapter.fetchCandidates({
    now: checkedAt, config: createDefaultConfig(), limit, query,
    source: { schemaVersion: 1, id: "prototype_jooble", type: "broad_api", adapter: "jooble", name: "Jooble", reusable: true, enabled: true },
  });
  return candidates.map(c => ({ title: c.metadata.title, company: c.metadata.company, url: c.sourceUrl,
    location: c.metadata.location ?? "", description: c.transientDescription ?? "", availability: "unverified", checkedAt }));
}
