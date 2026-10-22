import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { forwardIssueUrl, forwardMailto, forwardedSubscribeUrl } from "@/lib/issue-present";
import { productivitySectionTopic } from "@/lib/schema";

describe("Option B scannable dashboard", () => {
  it("keeps Warehousing, jump chips, and forward links on the October 21 issue", () => {
    const issue = getIssue("aviation", "2026-10-21");
    expect(issue).toBeTruthy();
    if (!issue) return;

    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "broadcast" });
    const mailto = forwardMailto(issue).replaceAll("&", "&amp;");

    expect(html).toContain('class="dash-hero"');
    expect(html).toContain('class="dash-grid"');
    expect(html).toContain('class="dash-split"');
    expect(html).toContain('class="glossary-table"');
    expect(html).toContain('href="#recruiting"');
    expect(html).toContain('href="#warehousing"');
    expect(html).toContain('id="warehousing"');
    expect(html).toContain('<span class="section-number" aria-hidden="true">06</span>');
    expect(html).toContain('<span class="section-title">Warehousing</span>');
    expect(html).toContain('class="jump-chip productivity"');
    expect(html).toContain(`<b>08</b> ${productivitySectionTopic}`);
    expect(html).toContain(">07</b> AOG support");
    expect(html).toContain(`href="${mailto}"`);
    expect(html.match(/>Forward this</g)).toHaveLength(2);
    expect(html.indexOf("Jump to")).toBeLessThan(html.indexOf(issue.lead.title));
    expect(html.indexOf('class="what-we-do-heading"')).toBeLessThan(html.indexOf("Sign-Up Now"));
    expect(html.indexOf("Sign-Up Now")).toBeLessThan(html.indexOf(issue.lead.title));
    expect(html.indexOf(issue.lead.title)).toBeLessThan(html.indexOf('aria-hidden="true">01<'));
    expect(html.indexOf('class="slot house"')).toBeLessThan(html.indexOf('class="what-we-do-heading"'));
    expect(html).toContain("Pick your topics - get only the sections you care about");
    expect(html).toContain('href="/join">Customize your issue</a>');
    expect(html.indexOf('aria-hidden="true">08<')).toBeLessThan(html.indexOf('class="ramp-heading"'));
    expect(html.indexOf('class="ramp-heading"')).toBeLessThan(html.indexOf('class="issue-toolbox"'));
    expect(html.indexOf('class="issue-toolbox"')).toBeLessThan(html.indexOf('class="glossary-heading"'));
    expect(decodeURIComponent(forwardMailto(issue))).toContain(forwardIssueUrl(issue));
    expect(forwardIssueUrl(issue)).toContain("?src=forward");

    expect(email).toContain('width="600"');
    expect(email).toContain("max-width:600px");
    expect(email).toContain(".vz-wrap { width: 100% !important; max-width: 100% !important; }");
    expect(email).not.toContain('width="50%"');
    expect(email).toContain(".vz-stack");
    expect(email).toContain('height="32"');
    expect(email).toContain("background:#f4f1ea");
    expect(email).toContain("Forwarded this? Subscribe!");
    expect(email).toContain(`href="${forwardedSubscribeUrl}"`);
    expect(forwardedSubscribeUrl).toBe("https://www.vizonix.com/join?src=forwarded");
    expect(email.indexOf("Forwarded this? Subscribe!")).toBeLessThan(email.indexOf(issue.lead.title));
    expect(email.match(/>Forward this</g)).toHaveLength(2);
    expect(email.lastIndexOf("Forward this")).toBeGreaterThan(email.indexOf("AI Glossary"));
    expect(email).toContain(`href="${mailto}"`);
    expect(email).toContain('href="#warehousing"');
    expect(email).toContain(">06</td>");
    expect(email).toContain(">Warehousing</td>");
    expect(email).toContain(">07</b> AOG support</a>");
    expect(email).toContain(">AOG support: parts, rotables and technicians</td>");
    expect(email.indexOf("background:#f4f1ea")).toBeLessThan(email.indexOf("background:#13233b"));
    expect(email.indexOf("What We Do")).toBeLessThan(email.indexOf("Sign-Up Now"));
    expect(email.indexOf("Sign-Up Now")).toBeLessThan(email.indexOf(issue.lead.title));
    expect(email.indexOf(issue.lead.title)).toBeLessThan(email.indexOf(">01</td>"));
    expect(email).toContain("Pick your topics - get only the sections you care about");
    expect(email).toContain(">Customize your issue</a>");
    expect(email.indexOf(`>${productivitySectionTopic}</td>`)).toBeLessThan(email.indexOf(">The Ramp</td>"));
    expect(email.indexOf(">The Ramp</td>")).toBeLessThan(email.indexOf("The Vizonix Toolbox"));
    expect(email.indexOf("The Vizonix Toolbox")).toBeLessThan(email.indexOf(">AI Glossary</h2>"));
    expect(text.indexOf("WHAT WE DO")).toBeLessThan(text.indexOf("SIGN-UP NOW"));
    expect(text.indexOf("SIGN-UP NOW")).toBeLessThan(text.indexOf(issue.lead.title));
    expect(text.indexOf(issue.lead.title)).toBeLessThan(text.indexOf("RECRUITING"));
    expect(text).toContain("Pick your topics - get only the sections you care about");
    expect(text).toContain("Customize your issue:");
    expect(text.indexOf("QUICK LINKS")).toBeLessThan(text.indexOf("THE RAMP"));
    expect(text.indexOf("THE RAMP")).toBeLessThan(text.indexOf("The Vizonix Toolbox"));
    expect(text.indexOf("The Vizonix Toolbox")).toBeLessThan(text.indexOf("AI GLOSSARY"));

    expect(text.indexOf(`Forwarded this? Subscribe! ${forwardedSubscribeUrl}`)).toBeLessThan(
      text.indexOf(issue.lead.title),
    );
    expect(text.split("Forward this:").length - 1).toBe(2);
    expect(text.lastIndexOf("Forward this:")).toBeGreaterThan(text.indexOf("AI GLOSSARY"));
    expect(html).not.toMatch(/[\u2013\u2014]/);
    expect(email).not.toMatch(/[\u2013\u2014]/);
    expect(text).not.toMatch(/[\u2013\u2014]/);
  });
});
