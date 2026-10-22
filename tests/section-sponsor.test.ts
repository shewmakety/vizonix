import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText, sectionSponsorRatesUrl } from "@/lib/email";
import { sectionSponsorKicker, sectionSponsorOpenLabel } from "@/lib/issue-present";
import { issueSchema, type Issue, type SectionSponsor } from "@/lib/schema";

const sponsor: SectionSponsor = {
  name: "Hangar Lane",
  line: "Parts search for an AOG desk.",
  url: "https://example.com/hangar-lane",
  logo: "https://example.com/hangar-lane.png",
};

function withSponsor(issue: Issue, topic: string, creative: SectionSponsor | undefined): Issue {
  return {
    ...issue,
    sections: issue.sections?.map((section) =>
      section.topic === topic ? { ...section, sponsor: creative } : section,
    ),
  };
}

describe("section sponsors", () => {
  it("shows an open placeholder on every numbered section and keeps the primary block", () => {
    const issue = getIssue("aviation", "2026-10-21");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const count = issue.sections?.length ?? 0;
    expect(count).toBe(8);
    const rates = sectionSponsorRatesUrl(issue);
    expect(rates).toBe(issue.sponsors.primary?.ctaUrl);

    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "broadcast" });

    expect(html.match(new RegExp(sectionSponsorOpenLabel, "g"))).toHaveLength(count);
    expect(email.match(new RegExp(sectionSponsorOpenLabel, "g"))).toHaveLength(count);
    expect(text.match(new RegExp(sectionSponsorOpenLabel, "g"))).toHaveLength(count);
    expect(html).toContain(`<a href="${rates}">${sectionSponsorOpenLabel}</a>`);
    expect(email).toContain(`href="${rates}"`);
    expect(text).toContain(`${sectionSponsorOpenLabel}: ${rates}`);
    expect(html.indexOf("Primary sponsor - open")).toBeLessThan(html.indexOf(sectionSponsorOpenLabel));
    expect(email.indexOf("Primary sponsor - open")).toBeLessThan(email.indexOf(sectionSponsorOpenLabel));
    expect(text.indexOf("PRIMARY SPONSOR")).toBeLessThan(text.indexOf(sectionSponsorOpenLabel));

    const productivity = html.slice(html.indexOf('id="general-ai-productivity-tools"'));
    expect(productivity.indexOf("section-title")).toBeLessThan(productivity.indexOf(sectionSponsorOpenLabel));
    expect(productivity.indexOf(sectionSponsorOpenLabel)).toBeLessThan(productivity.indexOf("ChatGPT Slides"));
    const emailProductivity = email.slice(email.indexOf(">General AI Productivity Tools</td>"));
    expect(emailProductivity.indexOf(sectionSponsorOpenLabel)).toBeGreaterThan(-1);
    expect(emailProductivity.indexOf(sectionSponsorOpenLabel)).toBeLessThan(emailProductivity.indexOf("ChatGPT Slides"));
  });

  it("renders a section sponsor and drops it when that section is excluded", () => {
    const source = getIssue("aviation", "2026-10-21");
    expect(source).toBeTruthy();
    if (!source) return;
    const issue = withSponsor(source, "Recruiting", sponsor);
    expect(issueSchema.safeParse(issue).success).toBe(true);
    expect(issueSchema.safeParse(withSponsor(source, "Recruiting", { ...sponsor, line: "" })).success).toBe(false);
    const withoutLogo = withSponsor(source, "Warehousing", { name: sponsor.name, line: sponsor.line, url: sponsor.url });
    expect(issueSchema.safeParse(withoutLogo).success).toBe(true);

    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "test" });
    const recruiting = html.slice(html.indexOf('id="recruiting"'), html.indexOf('id="sales-and-marketing"'));
    expect(recruiting).toContain(sectionSponsorKicker);
    expect(recruiting).toContain(sponsor.name);
    expect(recruiting).toContain(sponsor.line);
    expect(recruiting).toContain(`href="${sponsor.url}"`);
    expect(recruiting).toContain('rel="sponsored"');
    expect(recruiting).toContain(`src="${sponsor.logo}"`);
    expect(recruiting).not.toContain(sectionSponsorOpenLabel);
    expect(html.match(new RegExp(sectionSponsorOpenLabel, "g"))).toHaveLength(7);

    expect(email).toContain(sponsor.name);
    expect(email).toContain(`href="${sponsor.url}"`);
    expect(email).toContain(`src="${sponsor.logo}"`);
    expect(email).toContain('rel="sponsored"');
    expect(text).toContain("SECTION SPONSOR");
    expect(text).toContain(sponsor.name);
    expect(text).toContain(sponsor.line);
    expect(text).toContain(sponsor.url);

    const hidden = renderIssueEmail(issue, { mode: "test", excludedSections: ["Recruiting"] });
    const hiddenText = renderIssueText(issue, { mode: "test", excludedSections: ["Recruiting"] });
    expect(hidden).not.toContain(">Recruiting</td>");
    expect(hidden).not.toContain(sponsor.name);
    expect(hidden).not.toContain(sponsor.url);
    expect(hidden).not.toContain(sponsor.logo);
    expect(hidden).toContain("Primary sponsor - open");
    expect(hidden).toContain(">Sales &amp; Marketing</td>");
    expect(hidden.match(new RegExp(sectionSponsorOpenLabel, "g"))).toHaveLength(7);
    expect(hiddenText).not.toContain(sponsor.name);
    expect(hiddenText).not.toContain(sponsor.url);
    expect(hiddenText).toContain("PRIMARY SPONSOR");
    expect(hiddenText).toContain("SALES & MARKETING");
  });
});
