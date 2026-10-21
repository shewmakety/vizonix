import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail } from "@/lib/email";
import { sectionIconBaseUrl } from "@/lib/icons";
import { issueSchema, productivitySectionTopic } from "@/lib/schema";

describe("issue section headings", () => {
  it("renders numbered editorial topic headings on the page and in the email", () => {
    const issue = getIssue("aviation", "2026-10-16");
    expect(issue).toBeTruthy();
    const html = renderToStaticMarkup(createElement(IssueBody, { issue: issue! }));
    const topics = [
      ["01", "recruiting", "Recruiting"],
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
    expect(heading).toContain("align-items: center");
    expect(heading).toContain("gap: 12px");
    expect(heading).toContain("border-bottom: 3px solid #13233b");
    expect(heading).toContain("padding: 0 0 6px");
    expect(heading).toContain("margin: 0 0 8px");
    expect(heading).toContain("font-size: 24px");
    expect(heading).toContain("font-weight: 800");
    expect(heading).toContain("line-height: 1.15");
    expect(heading).not.toContain("border-radius");
    expect(heading).not.toContain("#14532D");
    expect(heading).not.toContain("font-size: 18px");
    expect(css).toContain(".issue-section { margin-top: 30px; }");
    const number = css.slice(css.indexOf(".section-number {"), css.indexOf(".section-title {"));
    expect(number).toContain("font-size: 40px");
    expect(number).toContain("font-weight: 800");
    expect(number).toContain("letter-spacing: 0");
    expect(number).toContain("color: #c9b98f");
    expect(number).not.toContain("font-size: 18px");
    expect(css).toContain("--section-number: #14532D");
    expect(css).toContain("font-style: italic");
    expect(css).not.toContain("font-size: 26px");
    expect(css).not.toContain("font-size: 22px");
    expect(css).not.toContain("border-radius: 999px");
    expect(css).not.toContain("#166534");
    const dark = css.slice(css.indexOf("@media (prefers-color-scheme: dark)"));
    expect(dark).toContain("--ink: #f3f0e8");
    expect(dark).toContain("--section-number: #8FBC8F");

    const email = renderIssueEmail(issue!, { mode: "broadcast" });
    expect(email).not.toContain("section-heading");
    expect(email).not.toContain("section-number");
    expect(email).not.toContain("issue-section");
    expect(email).toContain("border-bottom:3px solid #13233b");
    expect(email).toContain('valign="middle"');
    expect(email).toContain(
      'style="font-family:Arial,Helvetica,sans-serif;font-size:40px;font-weight:800;line-height:1;color:#c9b98f;">01</td>',
    );
    expect(email).toContain(
      'style="font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;line-height:1.15;color:#13233b;">Recruiting</td>',
    );
    expect(email).toContain(
      `style="font-family:Arial,Helvetica,sans-serif;font-size:30px;font-weight:800;line-height:1.15;color:#ffffff;">${productivitySectionTopic}</td>`,
    );
    expect(email).toContain("background:#14532D;border-radius:10px");
    expect(html).toContain('class="issue-section productivity"');
    expect(css).toContain(".issue-section.productivity");
    expect(css).toContain("font-size: 30px");
    expect(css).toContain("width: 28px");
    expect(css).toContain(".issue-section.productivity .section-icon");
    expect(css).toContain("width: 36px");
    expect(html).not.toContain('class="ramp-heading"');
    expect(html).not.toContain("/the-ramp.svg");
    expect(email).not.toContain("The Ramp");
    const icons = [
      ["Recruiting", "recruiting", 28, 28],
      ["Sales and marketing", "sales", 28, 28],
      ["Predictive maintenance", "predictive", 28, 28],
      ["Maintenance activity optimization", "maintenance", 28, 28],
      ["Troubleshooting support", "troubleshooting", 28, 28],
      ["Warehousing", "warehousing", 28, 28],
      ["AOG support: parts, rotables and technicians", "aog", 28, 28],
      [productivitySectionTopic, "ai-tools", 36, 36],
      ["Top story", "top-story", 28, 28],
      ["Playbook", "playbook", 24, 24],
      ["Quick links", "quick-links", 24, 24],
    ] as const;
    for (const [alt, stem, webPx, emailPx] of icons) {
      expect(html).toContain(
        `class="section-icon" src="${sectionIconBaseUrl}/${stem}.svg" alt="" width="${webPx}" height="${webPx}"`,
      );
      expect(email).toContain(
        `src="${sectionIconBaseUrl}/${stem}@2x.png" alt="${alt}" width="${emailPx}" height="${emailPx}"`,
      );
      expect(email).toContain(`width:${emailPx}px;height:${emailPx}px;`);
    }
    expect(html).not.toContain("@2x.png");
    expect(email).not.toContain(".svg");
    expect(html.match(/class="section-icon"/g)).toHaveLength(icons.length);
    expect(email).toContain("background:#f7efe2;border:1px solid #e0cfae");
    expect(email).not.toContain('<h2 style="margin:0;font-size:22px;font-weight:normal;">Recruiting</h2>');
    expect(email.indexOf(">01</td>")).toBeLessThan(email.indexOf(">08</td>"));
    expect(email.indexOf(">AOG support: parts, rotables and technicians</td>")).toBeLessThan(
      email.indexOf(`>${productivitySectionTopic}</td>`),
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
