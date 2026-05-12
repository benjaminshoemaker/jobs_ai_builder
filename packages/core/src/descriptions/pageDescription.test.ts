import { describe, expect, it } from "vitest";

import { extractJobDescriptionFromHtml } from "./pageDescription.js";

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
});
