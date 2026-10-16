import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail } from "@/lib/email";

describe("issue section headings", () => {
  it("renders topic headings as gray pills on the page and leaves the email plain", () => {
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
    const rule = css.slice(css.indexOf(".section-heading {"), css.indexOf(".section-heading {") + 400);
    expect(rule).toContain("display: inline-block");
    expect(rule).toContain("border-radius: 999px");
    expect(rule).toContain("background: #e5e7eb");
    expect(rule).toContain("color: #1c1915");
    expect(rule).toContain("font-weight: 600");
    expect(css).toContain(".issue-section { margin-top: 2.25rem; }");

    const email = renderIssueEmail(issue!, { mode: "broadcast" });
    expect(email).not.toContain("section-heading");
    expect(email).not.toContain("issue-section");
    expect(email).toContain("<h2 style=\"margin:0;font-size:22px;font-weight:normal;\">Recruiting pilots and technicians</h2>");
  });
});
