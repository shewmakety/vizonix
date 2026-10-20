import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { listIssues } from "@/lib/content";
import { issueDateline } from "@/lib/dates";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { buildLinkedInPost } from "@/lib/linkedin";
import { getSegment } from "@/lib/segments";
import { whatWeDo } from "@/lib/site";

describe("What We Do and the shared issue header", () => {
  it("uses one constant on every issue page and email, ahead of the body", () => {
    expect(whatWeDo.heading).toBe("What We Do");
    expect(whatWeDo.copy).toBe(
      "The VIZONIX Daily is a free, five-minute briefing on how AI and robotics are changing aviation operations. Each weekday we pick the news that matters to MROs, operators and suppliers, explain it in plain English, and show where to put AI and robotics to work.",
    );
    expect(whatWeDo.copy).not.toMatch(/[\u2013\u2014]/);
    expect(whatWeDo.copy).not.toMatch(/legal|warehousing|marketing/i);

    const issues = listIssues("aviation");
    expect(issues.length).toBeGreaterThan(0);
    for (const issue of issues) {
      const source = fs.readFileSync(
        path.join(process.cwd(), "content", "aviation", "issues", `${issue.date}.json`),
        "utf8",
      );
      expect(source).not.toContain(whatWeDo.heading);
      expect(source).not.toContain("five-minute briefing");

      const segmentName = getSegment(issue.segment)?.name ?? issue.segment;
      const dateline = issueDateline(segmentName, issue);
      const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
      const email = renderIssueEmail(issue, { mode: "broadcast" });
      const text = renderIssueText(issue, { mode: "broadcast" });

      expect(html).toContain(`<h1 class="issue-title">${issue.subject}</h1>`);
      expect(html).toContain(`<p class="issue-dateline">${dateline}</p>`);
      expect(html).toContain(`<h2 class="what-we-do-heading">${whatWeDo.heading}</h2>`);
      expect(html).toContain(whatWeDo.copy);
      expect(html.indexOf(`<h1 class="issue-title">`)).toBeLessThan(html.indexOf(dateline));
      expect(html.indexOf(`class="issue-dateline"`)).toBeLessThan(html.indexOf("what-we-do-heading"));
      expect(html.indexOf(whatWeDo.copy)).toBeLessThan(html.indexOf(issue.lead.title));

      expect(email).toContain(
        `font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:normal;color:#1c1915;">${issue.subject}</h1>`,
      );
      expect(email).toContain(`color:#14532D;">${dateline}</p>`);
      expect(email).toContain(`border-top:2px solid #14532D;`);
      expect(email).toContain(`color:#14532D;">${whatWeDo.heading}</h2>`);
      expect(email).toContain(whatWeDo.copy);
      expect(email.indexOf(`font-size:32px;`)).toBeLessThan(email.indexOf(dateline));
      expect(email.indexOf(dateline)).toBeLessThan(email.indexOf(whatWeDo.heading));
      expect(email.indexOf(whatWeDo.copy)).toBeLessThan(email.indexOf(issue.lead.title));
      expect(email).not.toContain("section-heading");

      expect(text.indexOf(issue.subject)).toBeLessThan(text.indexOf(dateline));
      expect(text.indexOf(dateline)).toBeLessThan(text.indexOf("WHAT WE DO"));
      expect(text.indexOf(whatWeDo.copy)).toBeLessThan(text.indexOf(issue.lead.title));

      const post = buildLinkedInPost(issue, `https://www.vizonix.com/aviation/issues/${issue.date}`);
      expect(post).not.toContain(whatWeDo.copy);
      expect(post).not.toContain("The VIZONIX Daily:");
    }

    const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8");
    const title = css.slice(css.indexOf(".issue-title {"), css.indexOf(".issue-dateline {"));
    expect(title).toContain("font-family: Georgia");
    expect(title).toContain("font-size: 40px");
    expect(title).toContain("margin: 0 0 10px");
    const dateline = css.slice(css.indexOf(".issue-dateline {"), css.indexOf(".what-we-do {"));
    expect(dateline).toContain("color: #14532D");
    expect(dateline).toContain("margin: 0 0 28px");
    const block = css.slice(css.indexOf(".what-we-do {"), css.indexOf(".what-we-do p"));
    expect(block).toContain("border-top: 2px solid #14532D");
    expect(block).toContain("font-family: Georgia");
    expect(block).toContain("font-size: 24px");
    expect(block).toContain("font-style: italic");
    expect(css).not.toContain("font-size: 18px");
    expect(css).not.toContain("font-size: 22px");
    expect(css).not.toContain("font-size: 26px");
  });
});
