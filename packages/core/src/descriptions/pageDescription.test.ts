import { describe, expect, it, vi } from "vitest";

import { extractJobDescriptionFromHtml, fetchJobDescription } from "./pageDescription.js";

describe("page description extraction", () => {
  it("prefers JobPosting JSON-LD descriptions", () => {
    const description = extractJobDescriptionFromHtml(`
      <html>
        <body>Navigation text</body>
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "JobPosting",
            "title": "AI Builder",
            "description": "<p>Build customer-facing AI workflows.</p><p>Use Claude Code and agent orchestration.</p>"
          }
        </script>
      </html>
    `);

    expect(description).toBe("Build customer-facing AI workflows.\nUse Claude Code and agent orchestration.");
  });

  it("falls back to readable page body text", () => {
    const description = extractJobDescriptionFromHtml(`
      <html>
        <body>
          <main>
            <h1>Product Builder</h1>
            <p>Own product discovery and ship MVPs with Cursor.</p>
            <script>window.noise = true;</script>
          </main>
        </body>
      </html>
    `);

    expect(description).toContain("Product Builder");
    expect(description).toContain("Own product discovery and ship MVPs with Cursor.");
    expect(description).not.toContain("window.noise");
  });

  it("uses search fallback when the source URL blocks direct fetching", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);
      if (requestUrl === "https://jooble.org/jdp/123") {
        return response("blocked", { ok: false, status: 403 });
      }
      if (requestUrl.startsWith("https://duckduckgo.com/html/")) {
        return response(`
          <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F123">LinkedIn</a>
          <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fjobs%2Fai-builder">Example</a>
        `);
      }
      if (requestUrl === "https://example.com/jobs/ai-builder") {
        return response(`
          <html><body><main>
            <h1>AI Builder Fellowship</h1>
            <p>TowerBrook fellows use Claude Code and agent architecture to ship prototypes.</p>
          </main></body></html>
        `);
      }
      throw new Error(`Unexpected URL: ${requestUrl}`);
    });

    const result = await fetchJobDescription({
      sourceUrl: "https://jooble.org/jdp/123",
      title: "AI Builder Fellowship",
      company: "TowerBrook",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(result).toMatchObject({
      source: "search",
      sourceUrl: "https://example.com/jobs/ai-builder",
    });
    expect(result.text).toContain("Claude Code");
  });

  it("rejects fallback pages that only match generic title or company suffix terms", async () => {
    const fetchImpl = vi.fn(async (url: string | URL | Request) => {
      const requestUrl = String(url);
      if (requestUrl === "https://jooble.org/jdp/expedia") {
        return response("blocked", { ok: false, status: 403 });
      }
      if (requestUrl.startsWith("https://duckduckgo.com/html/")) {
        return response(`
          <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fprincipal.example%2Finvestments">Principal</a>
        `);
      }
      if (requestUrl.startsWith("https://www.bing.com/search")) {
        return response("");
      }
      if (requestUrl === "https://principal.example/investments") {
        return response(`
          <html><body><main>
            <p>Principal Funds, Inc. offers retirement planning and insurance products.</p>
          </main></body></html>
        `);
      }
      throw new Error(`Unexpected URL: ${requestUrl}`);
    });

    const result = await fetchJobDescription({
      sourceUrl: "https://jooble.org/jdp/expedia",
      title: "Principal AI Builder Experiences PM",
      company: "Expedia, Inc.",
      fetchImpl: fetchImpl as typeof fetch,
    });

    expect(result.source).toBe("none");
  });
});

function response(
  body: string,
  options: { ok?: boolean; status?: number; contentType?: string } = {},
): Response {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    headers: new Headers({ "content-type": options.contentType ?? "text/html" }),
    text: async () => body,
  } as Response;
}
