import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText, welcomePlainMessage } from "@/lib/email";
import { escapeHtml } from "@/lib/html";
import { getSegment, segmentDisplayName, segmentHeaderName } from "@/lib/segments";
import { formatNumericDate, formatShortDate } from "@/lib/dates";
import { ISSUE_EMAIL_SUBJECT_PREFIX, issueEmailSubject } from "@/lib/publish";
import { sectionWordmark } from "@/lib/site";

const pathname = vi.hoisted(() => ({ value: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.value,
}));

import { SiteHeader } from "@/components/SiteHeader";

describe("header wordmark", () => {
  beforeEach(() => {
    pathname.value = "/";
  });

  it("keeps Vizonix on the homepage and general pages", () => {
    for (const path of ["/", "/about", "/sponsor", "/privacy", "/media-kit"]) {
      pathname.value = path;
      const html = renderToStaticMarkup(createElement(SiteHeader));
      expect(html).toContain('class="brand-mark">V</span>');
      expect(html).toContain('class="brand-name">Vizonix</span>');
      expect(html).not.toContain("AI &amp; Robotics News For Aviation");
    }
  });

  it("reads Vizonix - Customizable AI & Robotics News For Aviation on aviation pages", () => {
    const wordmark = escapeHtml(sectionWordmark(segmentHeaderName(getSegment("aviation")!)));
    expect(wordmark).toBe("Vizonix - Customizable AI &amp; Robotics News For Aviation");
    for (const path of ["/aviation", "/aviation/issues", "/aviation/issues/2026-10-20", "/aviation/tools"]) {
      pathname.value = path;
      const html = renderToStaticMarkup(createElement(SiteHeader));
      expect(html).toContain('class="brand-mark">V</span>');
      expect(html).toContain(`class="brand-name">${wordmark}</span>`);
      expect(html).toContain('href="/aviation"');
    }
  });

  it("uses the same wordmark on the email masthead", () => {
    const message = welcomePlainMessage("Aviation", "https://vizonix.com/aviation", "https://vizonix.com/unsub");
    expect(message.html).toContain(`>${sectionWordmark("Aviation")}</p>`);
    expect(message.html).not.toContain("text-transform:uppercase\">Vizonix");
    const gap = message.html.slice(0, message.html.indexOf("background:#13233b"));
    expect(gap).toContain('height="32"');
    expect(gap).toContain("background:#f4f1ea");
  });

  it("reads Vizonix - segment from the issue on the page and in the email", () => {
    const issue = getIssue("aviation", "2026-10-20");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const edition = segmentDisplayName(getSegment("aviation")!);
    const wordmark = sectionWordmark(segmentHeaderName(getSegment("aviation")!));
    const numeric = formatNumericDate(issue.date);
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "broadcast" });
    expect(edition).toBe("AI & Robotics News For Aviation");
    expect(wordmark).toBe("Vizonix - Customizable AI & Robotics News For Aviation");
    expect(numeric).toBe("10-20-2026");
    expect(getSegment("aviation")?.slug).toBe("aviation");
    expect(html).not.toContain('class="crumbs"');
    expect(html).not.toContain("issue-dateline");
    expect(html).toContain(
      `<h1 class="issue-title">${escapeHtml(issue.subject)}<span class="issue-title-date"> · ${numeric}</span></h1>`,
    );
    expect(email).toContain(
      `color:#ffffff;">${escapeHtml(issue.subject)}<span style="color:#c9b98f;"> · ${numeric}</span></h1>`,
    );
    expect(email).not.toContain("letter-spacing:0.08em;line-height:1.4;color:#c9b98f;");
    expect(email).toContain(`>${escapeHtml(wordmark)}</a>`);
    expect(email.indexOf(">V</a>")).toBeLessThan(email.indexOf(`>${escapeHtml(issue.subject)}<span`));
    expect(email).toContain('bgcolor="#122033"');
    const headerAt = email.indexOf('bgcolor="#122033"');
    const gapAt = email.indexOf('height="22"');
    const titleAt = email.indexOf("background:#13233b");
    expect(headerAt).toBeLessThan(gapAt);
    expect(gapAt).toBeLessThan(titleAt);
    expect(email.indexOf('align="right"')).toBeGreaterThan(headerAt);
    expect(email.indexOf('align="right"')).toBeLessThan(titleAt);
    expect(email).toContain(`the Vizonix ${escapeHtml(edition)} briefing`);
    expect(email).not.toContain(`the Vizonix Customizable ${escapeHtml(edition)} briefing`);
    const masthead = email.slice(titleAt, email.indexOf(escapeHtml(issue.subject)));
    expect(masthead).not.toContain("text-transform");
    const gap = email.slice(0, titleAt);
    expect(gap).toContain('width="640"');
    expect(gap).toContain("background-color:#d5dbe3");
    expect(gap).toContain("border:1px solid #cfd5de");
    expect(gap).toContain("border-radius:12px");
    expect(text.startsWith(`${wordmark}\n${issue.subject} · ${numeric}\n`)).toBe(true);
    expect(issueEmailSubject(issue.subject, issue.date)).toBe(
      `${ISSUE_EMAIL_SUBJECT_PREFIX}${formatShortDate(issue.date)} - ${issue.subject}`,
    );

    const other = { ...issue, segment: "field-service" };
    const otherHtml = renderToStaticMarkup(createElement(IssueBody, { issue: other }));
    const otherEmail = renderIssueEmail(other, { mode: "test" });
    expect(otherHtml).toContain(`<span class="issue-title-date"> · ${numeric}</span>`);
    expect(otherHtml).not.toContain("issue-dateline");
    expect(otherHtml).not.toContain("Customizable");
    expect(otherEmail).toContain(`<span style="color:#c9b98f;"> · ${numeric}</span>`);
    expect(otherEmail).not.toContain(escapeHtml(wordmark));
    expect(otherEmail).toContain(">Vizonix</a>");
  });
});
