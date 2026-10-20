import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText, welcomePlainMessage } from "@/lib/email";
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
      expect(html).not.toContain("Vizonix - Aviation");
    }
  });

  it("reads Vizonix - Aviation on aviation pages", () => {
    for (const path of ["/aviation", "/aviation/issues", "/aviation/issues/2026-10-20", "/aviation/tools"]) {
      pathname.value = path;
      const html = renderToStaticMarkup(createElement(SiteHeader));
      expect(html).toContain('class="brand-mark">V</span>');
      expect(html).toContain(`class="brand-name">${sectionWordmark("Aviation")}</span>`);
    }
  });

  it("uses the same wordmark on the email masthead", () => {
    const message = welcomePlainMessage("Aviation", "https://vizonix.com/aviation", "https://vizonix.com/unsub");
    expect(message.html).toContain(`>${sectionWordmark("Aviation")}</p>`);
    expect(message.html).not.toContain("text-transform:uppercase\">Vizonix");
  });

  it("reads Vizonix - segment from the issue on the page and in the email", () => {
    const issue = getIssue("aviation", "2026-10-20");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const wordmark = sectionWordmark("Aviation");
    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "broadcast" });
    expect(html).toContain(`>${wordmark}</a>`);
    expect(email).toContain(
      `font-family:Georgia,'Times New Roman',serif;font-size:23px;letter-spacing:0.01em;line-height:1.15;color:#f6f3ec;">${wordmark}</p>`,
    );
    const masthead = email.slice(email.indexOf("background:#13233b"), email.indexOf(wordmark));
    expect(masthead).not.toContain("text-transform");
    expect(text.startsWith(`${wordmark}\n`)).toBe(true);
    expect(issueEmailSubject(issue.subject)).toBe(`${ISSUE_EMAIL_SUBJECT_PREFIX}${issue.subject}`);

    const other = { ...issue, segment: "field-service" };
    const otherMark = sectionWordmark("field-service");
    const otherHtml = renderToStaticMarkup(createElement(IssueBody, { issue: other }));
    const otherEmail = renderIssueEmail(other, { mode: "test" });
    expect(otherHtml).toContain(`>${otherMark}</a>`);
    expect(otherEmail).toContain(`>${otherMark}</p>`);
    expect(otherEmail).not.toContain(wordmark);
  });
});
