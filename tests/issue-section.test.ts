import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail } from "@/lib/email";
import { issueSchema, productivitySectionTopic } from "@/lib/schema";

describe("issue section headings", () => {
  it("renders topic headings as green pills on the page and leaves the email plain", () => {
    const issue = getIssue("aviation", "2026-10-16");
    expect(issue).toBeTruthy();
    const html = renderToStaticMarkup(createElement(IssueBody, { issue: issue! }));
    const topics = [
      "Recruiting pilots and technicians",
      "Sales and marketing",
      "Predictive maintenance",
      "Maintenance activity optimization",
      "Troubleshooting support",
      "Warehousing",
      "AOG support: parts, rotables and technicians",
      productivitySectionTopic,
    ];
    for (const topic of topics) {
      expect(html).toContain(`<h2 class="section-heading">${topic}</h2>`);
    }
    expect(html).toContain(`<section class="issue-section"><h2 class="section-heading">${topics[0]}</h2>`);
    expect(html).toContain("<h2>Veryon puts an AI assistant inside the business aviation maintenance record</h2>");
    expect(html).toContain("<h2>Run a 30-day AI trial without betting the hangar</h2>");
    expect(html).toContain("<h2>Quick links</h2>");
    expect(html.match(/class="section-heading"/g)).toHaveLength(topics.length);

    const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
    const start = css.indexOf(".section-heading {");
    const rule = css.slice(start, start + 280);
    expect(rule).toContain("display: inline-block");
    expect(rule).toContain("border-radius: 999px");
    expect(rule).toContain("background: #14532D");
    expect(rule).toContain("color: #ffffff");
    expect(rule).toContain("font-weight: 600");
    expect(rule).not.toContain("#166534");
    expect(css).toContain(".issue-section { margin-top: 2.25rem; }");
    const dark = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
    expect(dark).toContain("background: #166534");
    expect(dark).toContain("color: #ffffff");

    const email = renderIssueEmail(issue!, { mode: "broadcast" });
    expect(email).not.toContain("section-heading");
    expect(email).not.toContain("issue-section");
    expect(email).toContain("<h2 style=\"margin:0;font-size:22px;font-weight:normal;\">Recruiting pilots and technicians</h2>");
    expect(email).toContain(`<h2 style="margin:0;font-size:22px;font-weight:normal;">${productivitySectionTopic}</h2>`);
    expect(email.indexOf("AOG support: parts, rotables and technicians")).toBeLessThan(
      email.indexOf(productivitySectionTopic),
    );
  });

  it("requires the productivity section after the industry topics", () => {
    const issue = getIssue("aviation", "2026-10-16");
    expect(issue?.sections?.at(-1)?.topic).toBe(productivitySectionTopic);
    const dropped = issueSchema.safeParse({ ...issue, sections: issue?.sections?.slice(0, -1) });
    expect(dropped.success).toBe(false);
    const moved = issueSchema.safeParse({
      ...issue,
      sections: issue?.sections ? [issue.sections.at(-1), ...issue.sections.slice(0, -1)] : [],
    });
    expect(moved.success).toBe(false);
  });
});
