import { listIssues } from "@/lib/content";
import { issuePublishedInstant } from "@/lib/dates";
import { getSegment } from "@/lib/segments";
import { absoluteUrl, site } from "@/lib/site";

function xml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildSegmentFeed(segmentSlug: string, now = new Date()): string | null {
  const segment = getSegment(segmentSlug);
  if (!segment || segment.status !== "active") return null;
  const issues = listIssues(segment.slug).filter((issue) => !issue.sample);
  const title = `${site.name} ${segment.name}`;
  const link = absoluteUrl(`/${segment.slug}`);
  const description = segment.summary;
  const items = issues
    .map((issue) => {
      const published = issuePublishedInstant(issue, now);
      const url = absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
      return [
        "<item>",
        `<title>${xml(issue.subject)}</title>`,
        `<link>${xml(url)}</link>`,
        `<guid isPermaLink="true">${xml(url)}</guid>`,
        `<pubDate>${xml(published.toUTCString())}</pubDate>`,
        `<description>${xml(issue.preheader)}</description>`,
        "</item>",
      ].join("");
    })
    .join("");
  const newest = issues[0] ? issuePublishedInstant(issues[0], now) : now;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0">',
    "<channel>",
    `<title>${xml(title)}</title>`,
    `<link>${xml(link)}</link>`,
    `<description>${xml(description)}</description>`,
    "<language>en-us</language>",
    `<lastBuildDate>${xml(newest.toUTCString())}</lastBuildDate>`,
    items,
    "</channel>",
    "</rss>",
  ].join("");
}
