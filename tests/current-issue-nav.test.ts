import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { latestPublishedIssue, publishedIssuePath } from "@/lib/content";
import { renderIssueEmail } from "@/lib/email";
import { featuredSegment } from "@/lib/segments";

const pathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

import { SiteHeader } from "@/components/SiteHeader";

function navHtml(): string {
  const html = renderToStaticMarkup(createElement(SiteHeader));
  const start = html.indexOf('aria-label="Site"');
  const end = html.indexOf("</nav>", start);
  return html.slice(start, end);
}

describe("current issue header", () => {
  beforeEach(() => {
    pathname.value = "/";
  });

  it("lists Current Issue first and keeps every item the same", () => {
    pathname.value = "/aviation/toolbox";
    const nav = navHtml();
    const labels = ["Current Issue", "Sponsor", "About", "Toolbox", "Subscribe"];
    let cursor = -1;
    for (const label of labels) {
      const at = nav.indexOf(`>${label}<`);
      expect(at).toBeGreaterThan(cursor);
      cursor = at;
    }
    expect(nav).toContain('href="/aviation/latest"');
    expect(nav).toContain('href="/aviation/toolbox"');
    expect(nav).toContain('href="/aviation/subscribe"');
    expect(nav).not.toContain("aria-current");
    expect(nav).not.toContain("header-cta");
    expect(nav).not.toMatch(/\/issues\/\d{4}-\d{2}-\d{2}/);

    pathname.value = "/about";
    expect(navHtml()).toContain(`href="/${featuredSegment().slug}/latest"`);

    const source = fs.readFileSync(path.join(process.cwd(), "components", "SiteHeader.tsx"), "utf8");
    expect(source).not.toMatch(/aviation/i);
    expect(source).not.toMatch(/\d{4}-\d{2}-\d{2}/);

    const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
    const navCss = css.slice(css.indexOf(".site-nav {"), css.indexOf(".nav-soon {"));
    expect(navCss).toContain("justify-content: flex-end");
    expect(navCss).toContain("white-space: nowrap");
    expect(navCss).not.toContain("aria-current");
    expect(css).not.toContain(".header-cta");
    const mobileStart = css.indexOf("@media (max-width: 860px)");
    const mobile = css.slice(mobileStart, css.indexOf(".tool-directory-list li", mobileStart));
    expect(mobile).toContain("overflow-x: auto");
    expect(mobile).toContain("justify-content: flex-end");
  });

  it("resolves /latest from the section's newest published issue and leaves the email menu alone", () => {
    const issue = latestPublishedIssue("aviation");
    expect(issue?.sample).toBe(false);
    expect(publishedIssuePath("aviation")).toBe(`/aviation/issues/${issue?.date}`);
    expect(publishedIssuePath("legal")).toBeUndefined();
    expect(publishedIssuePath("not-a-section")).toBeUndefined();

    const email = renderIssueEmail(issue!, { mode: "broadcast" });
    const header = email.slice(email.indexOf('bgcolor="#122033"'), email.indexOf("background:#13233b"));
    expect(header).toContain(">Sponsor</a>");
    expect(header).toContain(">Subscribe</a>");
    expect(header).not.toContain("Current Issue");
    expect(header).toContain("border:1px solid #c8b48a");
  });
});