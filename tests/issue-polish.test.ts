import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { sectionHeadingLabel, topStoryLabel } from "@/lib/issue-present";
import { issueSchema } from "@/lib/schema";
import { site } from "@/lib/site";

const postalAddress = "16703 Early Riser Ave Suite #510, Land O' Lakes, FL 34638";

afterEach(() => {
  site.postalAddress = postalAddress;
});

describe("issue polish", () => {
  it("title-cases section headings and turns and into &", () => {
    expect(sectionHeadingLabel("Sales and marketing")).toBe("Sales & Marketing");
    expect(sectionHeadingLabel("Predictive maintenance")).toBe("Predictive Maintenance");
    expect(sectionHeadingLabel("AOG support: parts, rotables and technicians")).toBe(
      "AOG Support: Parts, Rotables & Technicians",
    );
    expect(sectionHeadingLabel("General AI Productivity Tools")).toBe("General AI Productivity Tools");
    expect(topStoryLabel).toBe("Today's top story");
  });

  it("links each October 22 tool to its vendor site and the source article", () => {
    const issue = getIssue("aviation", "2026-10-22");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const tools = issue.sections?.flatMap((section) => section.tools) ?? [];
    expect(tools.length).toBeGreaterThan(0);
    for (const tool of tools) {
      expect(tool.vendorUrl, tool.slug).toMatch(/^https:\/\//);
    }
    expect(issueSchema.safeParse({ ...issue, sections: issue.sections }).success).toBe(true);
    const bad = structuredClone(issue);
    bad.sections![0].tools[0].vendorUrl = "not a url";
    expect(issueSchema.safeParse(bad).success).toBe(false);

    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "broadcast" });
    expect(html).toContain('href="https://levo.aero/">Contact the vendor</a>');
    expect(email).toContain('href="https://levo.aero/" style="color:#14532D;">Contact the vendor</a>');
    expect(html).toContain('href="https://levo.aero/">levo.aero</a>');
    expect(email).toContain("Website: <a href=\"https://levo.aero/\"");
    expect(text).toContain("Website: https://levo.aero/");
    expect(html).toContain('href="https://www.cae.com/civil-aviation/aviation-training/aircraft-maintenance-training/business-aircraft-maintenance-training/ready-for-work/">cae.com</a>');
    expect(html).toContain("https://www.ainonline.com/aviation-news/business-aviation/2026-10-21/cae-ready-work");
    expect(html).toContain('href="https://www.uas.aero/blogs/taking-the-next-step-in-aviations-digital-transformation">contact the vendor</a>');
    expect(email).toContain("color:#ffffff;font-size:12px");
    expect(email).toContain("border-color:#d7e8dc");
    const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
    expect(css).toContain(".issue-section.productivity .section-sponsor.open a { color: #ffffff; }");
    expect(css).toContain("border-color: #d7e8dc");
  });

  it("prints the CAN-SPAM postal address at the bottom of the issue email", () => {
    const issue = getIssue("aviation", "2026-10-22")!;
    expect(site.postalAddress).toBe(postalAddress);
    const email = renderIssueEmail(issue, { mode: "test" });
    const text = renderIssueText(issue, { mode: "test" });
    const postalHtml = escapeHtml(postalAddress);
    expect(email).toContain(postalHtml);
    expect(text).toContain(postalAddress);
    expect(email.indexOf(postalHtml)).toBeLessThan(email.indexOf("Contact us at:"));
    expect(text.indexOf(postalAddress)).toBeLessThan(text.indexOf("Contact us at:"));

    site.postalAddress = "   ";
    expect(renderIssueEmail(issue, { mode: "test" })).not.toContain("Early Riser");
    expect(renderIssueText(issue, { mode: "test" })).not.toContain("Early Riser");
  });
});
