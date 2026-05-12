export type PageDescriptionFetchOptions = {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  maxCharacters?: number;
};

const DEFAULT_TIMEOUT_MS = 8_000;
const DEFAULT_MAX_CHARACTERS = 30_000;

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
