import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { sitemapPaths } from "@/lib/site-index";
import { buildLlmsTxt } from "@/lib/llms";

const roots = ["app", "components", "content", "lib", "scripts", "tests"];
const files = ["README.md", ".env.example", ".github/workflows/ci.yml"];

function walk(dir: string, found: string[]) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (/\.(tsx?|json|css|md|yml|svg)$/.test(entry.name)) found.push(full);
  }
}

describe("site copy", () => {
  it("uses regular hyphens, never em dashes or en dashes", () => {
    const found: string[] = [];
    for (const root of roots) walk(path.join(process.cwd(), root), found);
    for (const file of files) {
      const full = path.join(process.cwd(), file);
      if (fs.existsSync(full)) found.push(full);
    }
    const bad = new RegExp(
    `${String.fromCharCode(0x2013)}|${String.fromCharCode(0x2014)}|&${"mdash"};|&${"ndash"};`,
    "i",
  );
    const offenders = found.filter((file) => bad.test(fs.readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("keeps sample pages out of the sitemap and names them in llms.txt", () => {
    const paths = sitemapPaths();
    expect(paths).toContain("/legal");
    expect(paths).toContain("/sponsor");
    expect(paths).not.toContain("/legal/issues/2026-10-14");
    expect(paths).not.toContain("/legal/tools/clauseharbor");
    const llms = buildLlmsTxt();
    expect(llms).toContain("Sample tool pages");
    expect(llms).toContain("fictional");
  });
});
