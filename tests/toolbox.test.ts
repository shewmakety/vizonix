import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { sitemapPaths } from "@/lib/site-index";
import { sectionIconBaseUrl } from "@/lib/icons";
import { absoluteUrl, toolboxCard } from "@/lib/site";
import { filterToolbox, listToolbox, toolboxCategories } from "@/lib/toolbox";

describe("aviation toolbox", () => {
  const entries = listToolbox();

  it("lists real tools with official https URLs and the section categories", () => {
    expect(entries.length).toBeGreaterThanOrEqual(60);
    const labels = new Set(toolboxCategories.map((category) => category.label));
    const seen = new Set<string>();
    for (const entry of entries) {
      expect(entry.url.startsWith("https://")).toBe(true);
      expect(entry.use).not.toMatch(/[\u2013\u2014]/);
      expect(entry.use).not.toMatch(/\$\d/);
      expect(entry.categories.every((category) => labels.has(category))).toBe(true);
      expect(entry.tags.length).toBeGreaterThan(0);
      const key = `${entry.name}\n${entry.vendor}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
    expect(entries.some((entry) => entry.name === "Donecle" && entry.tags.includes("Robotics"))).toBe(true);
    expect(entries.some((entry) => entry.categories.includes("General AI Productivity Tools"))).toBe(true);
    expect(sitemapPaths()).toContain("/aviation/toolbox");
    expect(sitemapPaths()).not.toContain("/aviation/tools");
  });

  it("filters by category and search", () => {
    const robotics = filterToolbox(entries, { category: "robotics" });
    expect(robotics.some((entry) => entry.name === "Nordic Dino")).toBe(true);
    expect(robotics.some((entry) => entry.name === "ChatGPT")).toBe(false);
    const veryon = filterToolbox(entries, { category: "predictive-maintenance", q: "Veryon" });
    expect(veryon.map((entry) => entry.name)).toEqual(["Defect Analysis (next generation)"]);
    expect(filterToolbox(entries, { q: "no-such-tool-xyz" })).toHaveLength(0);
  });

  it("links the issue to the Toolbox without listing the catalog in the email", () => {
    const issue = getIssue("aviation", "2026-10-21");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    expect(html).toContain('href="/aviation/toolbox?src=issue"');
    expect(html).toContain(toolboxCard.heading);
    expect(html).toContain(toolboxCard.line);
    expect(html).toContain(toolboxCard.button);
    expect(html).toContain(`${sectionIconBaseUrl}/toolbox.svg`);
    expect(html).not.toContain("Visit the Toolbox");
    const email = renderIssueEmail(issue, { mode: "test" });
    const text = renderIssueText(issue, { mode: "test" });
    const url = absoluteUrl("/aviation/toolbox?src=email");
    expect(email).toContain(`href="${url}"`);
    expect(email).toContain(`${sectionIconBaseUrl}/toolbox@2x.png`);
    expect(email).toContain(toolboxCard.heading);
    expect(email).toContain(toolboxCard.button);
    expect(email).not.toContain("Visit the Toolbox");
    expect(text).toContain(toolboxCard.heading);
    expect(text).toContain(toolboxCard.line);
    expect(text).toContain(`${toolboxCard.button}: ${url}`);
    expect(email).not.toContain("Nordic Dino");
    expect(text).not.toContain("Nordic Dino");
  });
});
