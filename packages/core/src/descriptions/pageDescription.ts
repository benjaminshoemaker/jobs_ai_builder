import { Buffer } from "node:buffer";

export type PageDescriptionFetchOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxCharacters?: number;
};

export type JobDescriptionFetchInput = PageDescriptionFetchOptions & {
  sourceUrl: string;
  title?: string;
  company?: string;
  allowSearchFallback?: boolean;
  searchResultLimit?: number;
};

export type JobDescriptionFetchResult = {
  text?: string;
  source: "direct" | "search" | "none";
  sourceUrl?: string;
};

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_CHARACTERS = 30_000;
const DEFAULT_SEARCH_RESULT_LIMIT = 5;

export async function fetchJobDescription(
  input: JobDescriptionFetchInput,
): Promise<JobDescriptionFetchResult> {
  const direct = await fetchPageDescription(input.sourceUrl, input);
  if (direct) {
    return { text: direct, source: "direct", sourceUrl: input.sourceUrl };
  }

  if (input.allowSearchFallback === false || !input.title || !input.company) {
    return { source: "none" };
  }

  return fetchSearchFallbackDescription({
    ...input,
    title: input.title,
    company: input.company,
  });
}

export async function fetchPageDescription(
  url: string,
  options: PageDescriptionFetchOptions = {},
): Promise<string | undefined> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
        "User-Agent": "AIBuilderJobs/0.1 (+https://local-cli.invalid)",
      },
    });
    if (!response.ok) return undefined;

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType && !/\b(?:html|text)\b/i.test(contentType)) {
      return undefined;
    }

    return extractJobDescriptionFromHtml(await response.text(), {
      maxCharacters: options.maxCharacters,
    });
  } catch {
    return undefined;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchSearchFallbackDescription(
  input: Required<Pick<JobDescriptionFetchInput, "sourceUrl" | "title" | "company">> &
    JobDescriptionFetchInput,
): Promise<JobDescriptionFetchResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const resultUrls: string[] = [];

  for (const searchUrl of buildSearchUrls(input.title, input.company)) {
    let searchHtml: string;
    try {
      const response = await fetchImpl(searchUrl, {
        redirect: "follow",
        headers: {
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.8",
          "User-Agent": "AIBuilderJobs/0.1 (+https://local-cli.invalid)",
        },
      });
      if (!response.ok) continue;
      searchHtml = await response.text();
    } catch {
      continue;
    }

    resultUrls.push(
      ...extractSearchResultUrls(searchHtml)
        .filter((url) => !shouldSkipFallbackUrl(url, input.sourceUrl)),
    );
    if (new Set(resultUrls).size >= (input.searchResultLimit ?? DEFAULT_SEARCH_RESULT_LIMIT)) {
      break;
    }
  }

  const uniqueResultUrls = [...new Set(resultUrls)].slice(
    0,
    input.searchResultLimit ?? DEFAULT_SEARCH_RESULT_LIMIT,
  );

  for (const resultUrl of uniqueResultUrls) {
    const description = await fetchPageDescription(resultUrl, input);
    if (description && descriptionLooksRelevant(description, input.title, input.company)) {
      return { text: description, source: "search", sourceUrl: resultUrl };
    }
  }

  return { source: "none" };
}

export function extractJobDescriptionFromHtml(
  html: string,
  options: { maxCharacters?: number } = {},
): string | undefined {
  const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CHARACTERS;
  const jsonLdDescription = extractJsonLdJobDescription(html);
  const text = normalizeDescriptionText(
    jsonLdDescription ?? htmlFragmentToText(extractPreferredHtmlFragment(html)),
  );

  if (!text || text.length < 40) {
    return undefined;
  }

  return text.length > maxCharacters ? `${text.slice(0, maxCharacters).trimEnd()}\n[truncated]` : text;
}

function extractJsonLdJobDescription(html: string): string | undefined {
  const scripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const match of scripts) {
    const rawJson = decodeHtmlEntities(stripHtmlComments(match[1] ?? "").trim());
    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(rawJson);
      const description = findJobPostingDescription(parsed);
      if (description) return htmlFragmentToText(description);
    } catch {
      continue;
    }
  }

  return undefined;
}

function findJobPostingDescription(value: unknown): string | undefined {
  if (Array.isArray(value)) {
    for (const item of value) {
      const description = findJobPostingDescription(item);
      if (description) return description;
    }
    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  if (isJobPosting(value) && typeof value.description === "string") {
    return value.description;
  }

  if (Array.isArray(value["@graph"])) {
    const description = findJobPostingDescription(value["@graph"]);
    if (description) return description;
  }

  for (const nested of Object.values(value)) {
    if (isRecord(nested) || Array.isArray(nested)) {
      const description = findJobPostingDescription(nested);
      if (description) return description;
    }
  }

  return undefined;
}

function isJobPosting(value: Record<string, unknown>): boolean {
  const type = value["@type"];
  if (typeof type === "string") return /\bJobPosting\b/i.test(type);
  if (Array.isArray(type)) {
    return type.some((item) => typeof item === "string" && /\bJobPosting\b/i.test(item));
  }
  return false;
}

function extractPreferredHtmlFragment(html: string): string {
  for (const tag of ["main", "article", "body"]) {
    const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
    if (match?.[1]) return match[1];
  }
  return html;
}

function htmlFragmentToText(fragment: string): string {
  const withoutNoise = fragment
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const withBreaks = withoutNoise
    .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/section|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "\n- ")
    .replace(/<[^>]+>/g, " ");
  return decodeHtmlEntities(withBreaks);
}

function normalizeDescriptionText(text: string): string {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith("#x") || entity.startsWith("#X")) {
      return codePointToString(Number.parseInt(entity.slice(2), 16), match);
    }
    if (entity.startsWith("#")) {
      return codePointToString(Number.parseInt(entity.slice(1), 10), match);
    }

    const named: Record<string, string> = {
      amp: "&",
      apos: "'",
      gt: ">",
      ldquo: "\"",
      lsquo: "'",
      nbsp: " ",
      quot: "\"",
      rdquo: "\"",
      rsquo: "'",
      lt: "<",
    };
    return named[entity.toLowerCase()] ?? match;
  });
}

function codePointToString(value: number, fallback: string): string {
  return Number.isFinite(value) ? String.fromCodePoint(value) : fallback;
}

function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractSearchResultUrls(html: string): string[] {
  const urls: string[] = [];
  for (const match of html.matchAll(/<a\b[^>]*class=["'][^"']*\bresult__a\b[^"']*["'][^>]*href=["']([^"']+)["']/gi)) {
    const url = decodeHtmlEntities(match[1] ?? "");
    const resolved = resolveDuckDuckGoUrl(url);
    if (resolved) urls.push(resolved);
  }
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["']/gi)) {
    const url = decodeHtmlEntities(match[1] ?? "");
    const resolved = resolveBingUrl(url);
    if (resolved) urls.push(resolved);
  }
  return [...new Set(urls)];
}

function resolveDuckDuckGoUrl(rawUrl: string): string | undefined {
  try {
    const absolute = rawUrl.startsWith("//")
      ? `https:${rawUrl}`
      : rawUrl.startsWith("/")
        ? `https://duckduckgo.com${rawUrl}`
        : rawUrl;
    const url = new URL(absolute);
    if (url.hostname.endsWith("duckduckgo.com") && url.pathname === "/l/") {
      return url.searchParams.get("uddg") ?? undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

function resolveBingUrl(rawUrl: string): string | undefined {
  try {
    const url = new URL(rawUrl);
    if (!url.hostname.endsWith("bing.com") || !url.pathname.startsWith("/ck/")) {
      return undefined;
    }
    const encoded = url.searchParams.get("u");
    if (!encoded) return undefined;
    const payload = encoded.startsWith("a1") ? encoded.slice(2) : encoded;
    const decoded = Buffer.from(payload, "base64url").toString("utf8");
    return decoded.startsWith("http") ? decoded : undefined;
  } catch {
    return undefined;
  }
}

function shouldSkipFallbackUrl(candidateUrl: string, sourceUrl: string): boolean {
  try {
    const candidate = new URL(candidateUrl);
    const source = new URL(sourceUrl);
    const hostname = candidate.hostname.replace(/^www\./, "");
    if (candidate.toString() === source.toString()) return true;
    if (hostname.endsWith("jooble.org")) return true;
    if (hostname.endsWith("linkedin.com")) return true;
    if (hostname.endsWith("duckduckgo.com")) return true;
    if (hostname.endsWith("google.com")) return true;
    return false;
  } catch {
    return true;
  }
}

function descriptionLooksRelevant(description: string, title: string, company: string): boolean {
  const text = normalizeForRelevance(description);
  const companyTokens = tokenizeForRelevance(company);
  const titleTokens = tokenizeForRelevance(title);
  const companyMatch = companyTokens.some((token) => text.includes(token));
  const titleMatches = titleTokens.filter((token) => text.includes(token)).length;
  if (titleTokens.length === 0) return companyMatch;
  return (companyMatch && titleMatches >= 1) || titleMatches >= Math.min(3, titleTokens.length);
}

function normalizeForRelevance(text: string): string {
  return ` ${text.toLowerCase().replace(/[^a-z0-9]+/g, " ")} `;
}

function tokenizeForRelevance(text: string): string[] {
  const stopwords = new Set([
    "and",
    "builder",
    "builders",
    "corp",
    "corporation",
    "company",
    "experiences",
    "for",
    "group",
    "inc",
    "incorporated",
    "job",
    "llc",
    "ltd",
    "new",
    "onsite",
    "principal",
    "remote",
    "senior",
    "the",
    "with",
  ]);
  return [...new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 3 && !stopwords.has(token))
      .map((token) => ` ${token} `),
  )];
}

function buildSearchUrls(title: string, company: string): string[] {
  const cleanedTitle = cleanTitleForSearch(title);
  const compactTitle = compactTitleForSearch(cleanedTitle);
  const queries = [
    `"${cleanedTitle}" ${company} job`,
    `"${title}" "${company}" job description`,
    compactTitle === cleanedTitle
      ? `${cleanedTitle} ${company} job`
      : `"${compactTitle}" "${company}"`,
  ].filter((query, index, queries) => queries.indexOf(query) === index);
  return queries.flatMap((query) => [
    `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
    `https://www.bing.com/search?q=${encodeURIComponent(query)}`,
  ]);
}

function cleanTitleForSearch(title: string): string {
  return title
    .replace(/\s*\([^)]*\)\s*$/g, "")
    .replace(/\s+(?:in|at)\s+[A-Z][A-Za-z .,-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function compactTitleForSearch(title: string): string {
  const tokens = title
    .replace(/[-_/|]+/g, " ")
    .replace(/[^a-zA-Z0-9+# ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 8);
  return tokens.join(" ");
}
