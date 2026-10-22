import fs from "fs";
import path from "path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { listIssues } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { issueHeaderLine } from "@/lib/issue-present";
import { buildLinkedInPost } from "@/lib/linkedin";
import { getSegment } from "@/lib/segments";
import { whatWeDo } from "@/lib/site";

describe("What We Do and the shared issue header", () => {
  it("uses one constant on every issue page and email, ahead of the body", () => {
    expect(whatWeDo.heading).toBe("What We Do");
    expect(whatWeDo.copy).toBe(
      "The VIZONIX Daily is a new, free briefing that helps aviation leaders put AI and robotics to work. Every weekday we pick the developments that matter to MROs, operators and suppliers, explain them in plain English, and show where they pay off. Choose the topics you care about, and we'll tailor every issue to you.",
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
      expect(source).not.toContain("we'll tailor every issue");

      const dateline = issueHeaderLine(issue);
      const datelineHtml = escapeHtml(dateline);
      const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
      const email = renderIssueEmail(issue, { mode: "broadcast" });
      const text = renderIssueText(issue, { mode: "broadcast" });

      expect(html).toContain(`<h1 class="issue-title">${issue.subject}</h1>`);
      expect(html).toContain(`<p class="issue-dateline">${datelineHtml}</p>`);
      const copyHtml = whatWeDo.copy.replaceAll("'", "&#x27;");
      const copyEmail = escapeHtml(whatWeDo.copy);
      expect(html).toContain(`<h2 class="what-we-do-heading">${whatWeDo.heading}</h2>`);
      expect(html).toContain(copyHtml);
      expect(html.indexOf(`<h1 class="issue-title">`)).toBeLessThan(html.indexOf(datelineHtml));
      expect(html.indexOf(`class="issue-dateline"`)).toBeLessThan(html.indexOf("what-we-do-heading"));
      expect(html.indexOf(copyHtml)).toBeLessThan(html.indexOf(issue.lead.title));

      expect(email).toContain(
        `font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;font-weight:normal;color:#ffffff;">${issue.subject}</h1>`,
      );
      expect(email).toContain(`color:#c9b98f;">${datelineHtml}</p>`);
      expect(email).toContain(`color:#c9b98f;">${whatWeDo.heading}</h2>`);
      expect(email).toContain(copyEmail);
      expect(email.indexOf(`font-size:30px;`)).toBeLessThan(email.indexOf(datelineHtml));
      expect(email.indexOf(datelineHtml)).toBeLessThan(email.indexOf(whatWeDo.heading));
      expect(email.indexOf(copyEmail)).toBeLessThan(email.indexOf(issue.lead.title));
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
    expect(title).toContain("font-size: 38px");
    expect(title).toContain("margin: 0 0 10px");
    expect(title).toContain("color: #ffffff");
    const dateline = css.slice(css.indexOf(".issue-dateline {"), css.indexOf(".what-we-do {"));
    expect(dateline).toContain("color: #c9b98f");
    expect(dateline).toContain("margin: 0;");
    const block = css.slice(css.indexOf(".what-we-do {"), css.indexOf(".what-we-do p"));
    expect(block).toContain("background: #13233b");
    expect(block).toContain("color: #c9b98f");
    expect(block).toContain("font-size: 12px");
    expect(block).toContain("text-transform: uppercase");
    expect(getSegment("aviation")?.name).toBe("Aviation");
  });
});
