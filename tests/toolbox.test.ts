import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { sitemapPaths } from "@/lib/site-index";
import { sectionIconBaseUrl } from "@/lib/icons";
import { absoluteUrl, toolboxCard, toolboxCardCopy, toolboxCardIcon } from "@/lib/site";
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
    const copy = toolboxCardCopy("aviation");
    expect(copy).toContain("curated, regularly updated list of AI and robotics tools");
    expect(copy).toContain("airlines, MROs, parts suppliers, operators, and maintenance / AOG teams");
    expect(copy).toContain("organized by the same topics as the issue");
    expect(copy).toContain("what the tool does and links to it");
    expect(copy).not.toMatch(/[\u2013\u2014]/);
    expect(html).toContain(toolboxCard.heading);
    expect(html).toContain(copy);
    expect(html).toContain(toolboxCard.button);
    expect(html).not.toContain("Quick links");
    expect(html).not.toContain(issue.playbook?.title ?? "missing playbook");
    expect(html).toContain(`${sectionIconBaseUrl}/toolbox-v2.svg`);
    expect(html).toContain(`width="${toolboxCardIcon.width}"`);
    expect(html).toContain(`height="${toolboxCardIcon.height}"`);
    expect(html).not.toContain('class="ramp-heading"');
    expect(html.indexOf('class="issue-toolbox"')).toBeLessThan(html.indexOf('class="glossary-heading"'));
    expect(html).not.toContain("Visit the Toolbox");
    const email = renderIssueEmail(issue, { mode: "test" });
    const text = renderIssueText(issue, { mode: "test" });
    const url = absoluteUrl("/aviation/toolbox?src=email");
    expect(email).toContain(`href="${url}"`);
    expect(email).toContain(`${sectionIconBaseUrl}/toolbox-v2@2x.png`);
    expect(email).toContain(`width="${toolboxCardIcon.width}"`);
    expect(email).toContain(`height="${toolboxCardIcon.height}"`);
    expect(email).not.toContain('width="560" height="240"');
    expect(email).toContain(toolboxCard.heading);
    expect(email).toContain(copy);
    expect(email).toContain(toolboxCard.button);
    expect(email).not.toContain("Quick links");
    expect(email).not.toContain(issue.playbook?.title ?? "missing playbook");
    expect(email).not.toContain(">The Ramp</td>");
    expect(email.indexOf(toolboxCard.heading)).toBeLessThan(email.indexOf(">AI Glossary</h2>"));
    expect(email).not.toContain("Visit the Toolbox");
    expect(text).toContain(toolboxCard.heading);
    expect(text).toContain(copy);
    expect(text).not.toContain("QUICK LINKS");
    expect(text).not.toContain(issue.playbook?.title ?? "missing playbook");
    expect(text).toContain(`${toolboxCard.button}: ${url}`);
    expect(text).not.toContain("THE RAMP");
    expect(text.indexOf(toolboxCard.heading)).toBeLessThan(text.indexOf("AI GLOSSARY"));
    expect(email).not.toContain("Nordic Dino");
    expect(text).not.toContain("Nordic Dino");
  });
});
