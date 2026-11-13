import { mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { Command } from "commander";
import { AssessmentSchema, BoardSchema, assessWithAI, atomicWriteJson, candidateId, collectBoard, collectJooble,
  makeCard, outsideUS, prioritize, referenceReview, referenceSet, renderCard, reserveApiRequests,
  PrototypeReviewsSchema as ReviewsSchema, PrototypeInputSchema as InputSchema, PrototypeReportSchema,
  type PrototypeCandidate, type PrototypeCard } from "../../../../packages/core/src/index.js";

const strings = (value: string, previous: string[]) => [...previous, value];
const positive = (value: string) => { const n = Number(value); if (!Number.isInteger(n) || n < 1) throw new Error("Expected a positive integer."); return n; };

export function registerPrototypeCommand(program: Command): void {
  const prototype = program.command("prototype").description("Qualifications-first discovery experiment; separate from the legacy classifier");
  prototype.command("references").description("Show user-labeled calibration examples").action(() => console.log(JSON.stringify(referenceSet, null, 2)));
  prototype.command("review <url>").requiredOption("--fit <fit>", "builder, engineering_blend, stretch, exclude, unclear (legacy focus-specific values also accepted)")
    .option("--focus <focus>", "comma-separated focus tags, e.g. product,design; new focuses allowed")
    .requiredOption("--reason <reason>", "your correction").option("--data-dir <dir>", "local runtime directory", "data")
    .action(async (url: string, options: { fit: string; focus?: string; reason: string; dataDir: string }) => {
      InputSchema.element.shape.url.parse(url);
      const file = path.join(options.dataDir, "prototype", "reviews.json");
      const reviews = await loadReviews(file);
      reviews[candidateId(url)] = ReviewsSchema.element.parse({ fit: options.fit,
        ...(options.focus ? { focus: options.focus.split(",").map(x => x.trim()) } : {}), reason: options.reason });
      await atomicWriteJson(file, ReviewsSchema, reviews);
      console.log("Saved user judgment. It takes precedence on subsequent scans and saved-result views.");
    });
  prototype.command("show").option("--data-dir <dir>", "local runtime directory", "data")
    .action(async (options: { dataDir: string }) => {
      const result = JSON.parse(await readFile(path.join(options.dataDir, "prototype", "latest.json"), "utf8")) as { cards: PrototypeCard[] };
      const reviews = await loadReviews(path.join(options.dataDir, "prototype", "reviews.json"));
      console.log(result.cards.map(c => renderCard({ ...c, review: reviews[c.id] ?? c.review })).join("\n\n"));
    });
  prototype.command("scan")
    .option("--board <provider:slug>", "public Ashby, Greenhouse or Lever board (repeatable)", strings, [])
    .option("--query <text>", "broad Jooble query (repeatable; requires JOOBLE_API_KEY)", strings, [])
    .option("--input <file>", "local candidate JSON; never treated as employer verification")
    .option("--live", "allow external collection requests")
    .option("--ai", "send posting text to OpenAI for reference-calibrated assessment")
    .option("--model <name>", "explicit model supporting Responses structured outputs")
    .option("--env-file <file>", "optional environment file", ".env.local")
    .option("--max-requests <n>", "total collection plus AI request cap for this run", positive, 5)
    .option("--api-budget <n>", "cumulative local prototype request budget", positive, 500)
    .option("--limit <n>", "maximum cards / AI assessments after deduplication", positive, 20)
    .option("--dry-run", "show request plan without network or writes")
    .option("--data-dir <dir>", "local runtime directory", "data")
    .action(runScan);
}

type Options = { board: string[]; query: string[]; input?: string; live?: boolean; ai?: boolean; model?: string;
  envFile: string; maxRequests: number; apiBudget: number; limit: number; dryRun?: boolean; dataDir: string };
async function runScan(options: Options): Promise<void> {
  for (const board of options.board) BoardSchema.parse(board);
  const boards = [...new Set(options.board)];
  const queries = [...new Set(options.query)];
  const collectionCount = boards.length + queries.length;
  if (collectionCount && !options.live) throw new Error("Use --live to authorize collection, or --input for offline candidates.");
  if (options.ai && !options.model) throw new Error("--ai requires an explicit --model.");
  if (collectionCount > options.maxRequests) throw new Error("Collection plan exceeds --max-requests. No requests made.");
  if (options.dryRun) {
    console.log(`Plan: ${collectionCount} collection request(s), up to ${options.ai ? Math.min(options.limit, options.maxRequests - collectionCount) : 0} AI assessments. Run cap: ${options.maxRequests}; cumulative budget: ${options.apiBudget}. No requests made.`);
    return;
  }
  if (!collectionCount && !options.input) { console.log("Choose --input <file> or --live with --board / --query. Use prototype references to inspect calibration examples."); return; }
  try { loadEnvFile(options.envFile); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  if (queries.length && !process.env.JOOBLE_API_KEY) throw new Error("JOOBLE_API_KEY is required for broad retrieval.");
  if (options.ai && !process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required for --ai; use extraction-only mode otherwise.");
  const checkedAt = new Date().toISOString();
  let used = 0;
  const spend = async (reason: string) => {
    if (used >= options.maxRequests) return false;
    await reserveApiRequests({ dataDir: options.dataDir, provider: "prototype", now: checkedAt, requestCount: 1, requestLimit: options.apiBudget, reason });
    used++; return true;
  };
  const candidates: PrototypeCandidate[] = [];
  const errors: string[] = [];
  if (options.input) {
    const input = InputSchema.parse(JSON.parse(await readFile(options.input, "utf8")));
    candidates.push(...input.map(c => ({ ...c, availability: "unverified" as const, checkedAt })));
  }
  for (const board of boards) {
    await spend(`Employer board ${board}`);
    try { candidates.push(...await collectBoard(board, checkedAt)); }
    catch { errors.push(`${board}: fetch/parse failed; availability unknown.`); }
  }
  for (const query of queries) {
    await spend("Broad Jooble retrieval");
    try { candidates.push(...await collectJooble(query, checkedAt, 50)); }
    catch { errors.push("Jooble retrieval failed; availability unknown."); }
  }
  const ordered = prioritize(candidates);
  const eligible = ordered.filter(c => !outsideUS(c.location));
  const selected = eligible.slice(0, options.limit);
  const reviews = await loadReviews(path.join(options.dataDir, "prototype", "reviews.json"));
  const cards: PrototypeCard[] = [];
  for (const candidate of selected) {
    const review = reviews[candidateId(candidate.url)] ?? referenceReview(candidate.url);
    let card = makeCard(candidate, undefined, undefined, review);
    if (options.ai && !review && candidate.description && await spend("Reference-calibrated AI assessment")) {
      try { card = makeCard(candidate, await assessWithAI(candidate, { model: options.model!, apiKey: process.env.OPENAI_API_KEY! }), `openai:${options.model}:prompt-v1`, review); }
      catch { errors.push(`${candidateId(candidate.url)}: AI assessment failed validation/request; retained as unclear.`); }
    }
    cards.push(card);
  }
  const report = { schemaVersion: 1, checkedAt, referenceCount: referenceSet.length,
    retrieved: candidates.length, distinct: ordered.length, omittedByLimit: Math.max(0, eligible.length - selected.length), outsideUS: ordered.length - eligible.length,
    requests: used, errors, cards };
  const dir = path.join(options.dataDir, "prototype");
  await mkdir(dir, { recursive: true });
  await atomicWriteJson(path.join(dir, "latest.json"), PrototypeReportSchema, report);
  console.log(`Retrieved ${report.retrieved}; distinct ${report.distinct}; showing ${cards.length}; outside U.S. ${report.outsideUS}; omitted by limit ${report.omittedByLimit}. Requests: ${used}/${options.maxRequests}. References: ${referenceSet.length}.`);
  console.log("Extraction-only cards are unclassified. Unverified availability and U.S. location need confirmation. User judgments are calibration, not measured accuracy.");
  if (errors.length) console.log(errors.join("\n"));
  console.log(cards.map(renderCard).join("\n\n"));
  console.log(`Saved ${path.join(dir, "latest.json")} (metadata and short evidence only).`);
}
async function loadReviews(file: string): Promise<ReturnType<typeof ReviewsSchema.parse>> {
  try { return ReviewsSchema.parse(JSON.parse(await readFile(file, "utf8"))); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}; throw error; }
}
