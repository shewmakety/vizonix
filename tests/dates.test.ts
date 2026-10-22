import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import {
  calendarInstant,
  formatIssueDate,
  formatLongDate,
  formatPublishedInstant,
  issueDateLine,
} from "@/lib/dates";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { buildSegmentFeed } from "@/lib/feed";
import { issueJsonLd } from "@/lib/jsonld";
import { buildLinkedInPost } from "@/lib/linkedin";
import { sitemapEntries } from "@/lib/site-index";

describe("date-only issue dates", () => {
  it("keeps the calendar day instead of shifting UTC midnight into the previous evening", () => {
    expect(formatLongDate("2026-10-16")).toBe("Friday, October 16, 2026");
    expect(formatPublishedInstant(new Date("2026-10-16T00:00:00.000Z"))).toBe("Thursday, October 15, 2026");
    expect(calendarInstant("2026-10-16").toISOString()).toBe("2026-10-16T12:00:00.000Z");
    expect(formatPublishedInstant(calendarInstant("2026-10-16"))).toBe("Friday, October 16, 2026");

    const monday = getIssue("aviation", "2026-10-19");
    expect(monday?.date).toBe("2026-10-19");
    expect(formatIssueDate(monday!)).toBe("Monday, October 19, 2026");
    expect(formatPublishedInstant(new Date(monday!.publishedAt!))).toBe("Monday, October 19, 2026");

    const tuesday = getIssue("aviation", "2026-10-20");
    expect(tuesday?.date).toBe("2026-10-20");
    expect(formatIssueDate(tuesday!)).toBe("Tuesday, October 20, 2026");
    expect(formatPublishedInstant(new Date(tuesday!.publishedAt!))).toBe("Tuesday, October 20, 2026");

    const issue = getIssue("aviation", "2026-10-16");
    expect(issue?.date).toBe("2026-10-16");
    expect(issue?.publishedAt).toBe("2026-10-15T06:28:02-04:00");
    expect(formatIssueDate(issue!)).toBe("Friday, October 16, 2026");
    expect(issueDateLine(issue!).startsWith("Friday, October 16, 2026. ")).toBe(true);

    const html = renderToStaticMarkup(createElement(IssueBody, { issue: issue! }));
    expect(html).toContain("Friday, October 16, 2026");
    expect(html).not.toContain("Thursday, October 15, 2026");

    const email = renderIssueEmail(issue!, { mode: "broadcast" });
    const text = renderIssueText(issue!, { mode: "broadcast" });
    expect(email).toContain("Friday, October 16, 2026");
    expect(email).not.toContain("Thursday, October 15, 2026");
    expect(text).toContain("Friday, October 16, 2026");

    const now = new Date("2026-12-01T00:00:00.000Z");
    const feed = buildSegmentFeed("aviation", now);
    expect(feed).toContain("Fri, 16 Oct 2026 12:00:00 GMT");
    expect(feed).not.toContain("15 Oct 2026");

    const article = issueJsonLd(issue!, now) as { datePublished: string };
    expect(article.datePublished).toBe("2026-10-16T12:00:00.000Z");

    const entry = sitemapEntries(now).find((item) => item.path === "/aviation/issues/2026-10-16");
    expect(entry?.lastModified.toISOString()).toBe(calendarInstant("2026-10-16").toISOString());
    const latest = sitemapEntries(now).find((item) => item.path === "/aviation/issues/2026-10-22");
    expect(latest?.lastModified.toISOString()).toBe("2026-10-22T12:00:00.000Z");
    const nyDay = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(entry!.lastModified);
    expect(nyDay).toBe("2026-10-16");

    const post = buildLinkedInPost(issue!, "https://www.vizonix.com/aviation/issues/2026-10-16");
    expect(post).toContain("AI moves into the hangar, plus 7 places to put it to work");
    expect(post).toContain("Read the full issue: https://www.vizonix.com/aviation/issues/2026-10-16");
    expect(post).not.toContain("Thursday, October 15, 2026");
    expect(post).not.toContain("October 15, 2026");
  });
});
