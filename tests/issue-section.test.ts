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
  it("renders numbered editorial topic headings on the page and in the email", () => {
    const issue = getIssue("aviation", "2026-10-16");
    expect(issue).toBeTruthy();
    const html = renderToStaticMarkup(createElement(IssueBody, { issue: issue! }));
    const topics = [
      ["01", "recruiting-pilots-and-technicians", "Recruiting pilots and technicians"],
      ["02", "sales-and-marketing", "Sales and marketing"],
      ["03", "predictive-maintenance", "Predictive maintenance"],
      ["04", "maintenance-activity-optimization", "Maintenance activity optimization"],
      ["05", "troubleshooting-support", "Troubleshooting support"],
      ["06", "warehousing", "Warehousing"],
      ["07", "aog-support-parts-rotables-and-technicians", "AOG support: parts, rotables and technicians"],
      ["08", "ai-productivity-tools", productivitySectionTopic],
    ] as const;
    for (const [number, id, topic] of topics) {
      expect(html).toContain(`id="${id}"`);
      expect(html).toContain(`<span class="section-number" aria-hidden="true">${number}</span>`);
      expect(html).toContain(`<span class="section-title">${topic}</span>`);
    }
    expect(html).toContain('class="section-heading"');
    expect(html).toContain("<h2>Veryon puts an AI assistant inside the business aviation maintenance record</h2>");
    expect(html).toContain("<h2>Run a 30-day AI trial without betting the hangar</h2>");
    expect(html).toContain("<h2>Quick links</h2>");
    expect(html.match(/class="section-heading"/g)).toHaveLength(topics.length);
    expect(html.indexOf(">01<")).toBeLessThan(html.indexOf(">08<"));

    const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
    const heading = css.slice(css.indexOf(".section-heading {"), css.indexOf(".section-number {"));
    expect(heading).toContain("display: flex");
    expect(heading).toContain("align-items: baseline");
    expect(heading).toContain("gap: 18px");
    expect(heading).toContain("border-top: 2px solid var(--ink)");
    expect(heading).toContain("padding: 16px 0 0");
    expect(heading).toContain("margin: 0 0 22px");
    expect(heading).toContain("font-size: clamp(30px, 4vw, 40px)");
    expect(heading).toContain("line-height: 1.15");
    expect(heading).not.toContain("border-radius");
    expect(heading).not.toContain("#14532D");
    expect(css).toContain(".issue-section { margin-top: 48px; }");
    const number = css.slice(css.indexOf(".section-number {"), css.indexOf(".section-title {"));
    expect(number).toContain("font-size: clamp(30px, 4vw, 40px)");
    expect(number).toContain("font-weight: 600");
    expect(number).toContain("letter-spacing: 0.08em");
    expect(number).toContain("color: var(--section-number)");
    expect(number).not.toContain("font-size: 18px");
    expect(css).toContain("--section-number: #14532D");
    expect(css).toContain("font-style: italic");
    expect(css).not.toContain("font-size: 26px");
    expect(css).not.toContain("font-size: 22px");
    expect(css).not.toContain("font-size: 18px");
    expect(css).not.toContain("border-radius: 999px");
    expect(css).not.toContain("#166534");
    const dark = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
    expect(dark).toContain("--ink: #f3f0e8");
    expect(dark).toContain("--section-number: #8FBC8F");

    const email = renderIssueEmail(issue!, { mode: "broadcast" });
    expect(email).not.toContain("section-heading");
    expect(email).not.toContain("section-number");
    expect(email).not.toContain("issue-section");
    expect(email).toContain("border-top:2px solid #1c1915");
    expect(email).toContain('valign="baseline"');
    expect(email).toContain(
      'style="padding:0 18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:600;font-style:normal;letter-spacing:0.08em;line-height:1.15;color:#14532D;">01</td>',
    );
    expect(email).toContain(
      'style="padding:0;font-family:Georgia,\'Times New Roman\',serif;font-size:30px;font-style:italic;font-weight:normal;line-height:1.15;color:#1c1915;">Recruiting pilots and technicians</td>',
    );
    expect(email).toContain(
      `style="padding:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-style:italic;font-weight:normal;line-height:1.15;color:#1c1915;">${productivitySectionTopic}</td>`,
    );
    expect(email).toContain("background:#f7efe2;border:1px solid #e0cfae");
    expect(email).not.toContain('<h2 style="margin:0;font-size:22px;font-weight:normal;">Recruiting pilots and technicians</h2>');
    expect(email.indexOf(">01<")).toBeLessThan(email.indexOf(">08<"));
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
