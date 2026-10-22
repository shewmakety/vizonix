import { describe, expect, it } from "vitest";
import { getIssue, listTools } from "@/lib/content";
import { formatIssueDate, formatPublishedInstant, issuePublishedInstant } from "@/lib/dates";
import { buildSegmentFeed } from "@/lib/feed";
import { issueJsonLd, organizationJsonLd, toolJsonLd } from "@/lib/jsonld";
import { capDescription } from "@/lib/meta";
import { getSegment, topicPageDescription } from "@/lib/segments";
import { sitemapEntries, sitemapPaths } from "@/lib/site-index";
import { toolPageTitle } from "@/lib/tool-page";

const now = new Date("2026-10-15T18:00:00.000Z");

describe("sitemap and feeds", () => {
  it("omits noindex and planned URLs and never uses a future lastmod", () => {
    const entries = sitemapEntries(now);
    const paths = entries.map((entry) => entry.path);
    expect(paths).toEqual(sitemapPaths());
    for (const path of [
      "/confirm",
      "/unsubscribe",
      "/sponsor/confirmed",
      "/legal",
      "/legal/issues",
      "/legal/tools",
      "/warehousing",
      "/marketing-sales",
    ]) {
      expect(paths).not.toContain(path);
    }
    for (const entry of entries) {
      expect(entry.lastModified.getTime()).toBeLessThanOrEqual(now.getTime());
      expect(entry.lastModified.toISOString()).not.toBe("2026-10-16T12:00:00.000Z");
    }
    const issue = getIssue("aviation", "2026-10-16");
    expect(issue?.publishedAt).toBe("2026-10-15T06:28:02-04:00");
    const published = issuePublishedInstant(issue!, now);
    expect(published.toISOString()).toBe("2026-10-15T10:28:02.000Z");
    expect(formatPublishedInstant(published)).toBe("Thursday, October 15, 2026");
    expect(formatIssueDate(issue!)).toBe("Friday, October 16, 2026");
    const issueEntry = entries.find((entry) => entry.path === "/aviation/issues/2026-10-16");
    expect(issueEntry?.lastModified.getTime()).toBeGreaterThanOrEqual(published.getTime());
    expect(issueEntry?.lastModified.toISOString()).toBe(now.toISOString());
  });

  it("builds an aviation RSS feed from the publish time", () => {
    const xml = buildSegmentFeed("aviation", now);
    expect(xml).toBeTruthy();
    expect(xml).toContain("<rss");
    expect(xml).toContain("AI moves into the hangar, plus 7 places to put it to work");
    expect(xml).not.toContain("hangar workflow");
    expect(xml).toContain("Fri, 16 Oct 2026 12:00:00 GMT");
    expect(xml).not.toContain("15 Oct 2026");
    expect(buildSegmentFeed("legal", now)).toBeNull();
    expect(buildSegmentFeed("warehousing", now)).toBeNull();
  });
});

describe("titles, schema, and profiles", () => {
  it("gives colliding tool names unique descriptive titles", () => {
    const segment = getSegment("aviation");
    expect(segment).toBeTruthy();
    const tools = listTools("aviation");
    const titles = tools.map((tool) => toolPageTitle(tool, segment!, tools));
    expect(new Set(titles).size).toBe(titles.length);
    const amelia = titles.filter((title) => title.startsWith("Amelia"));
    expect(amelia).toHaveLength(2);
    expect(amelia.every((title) => title.includes(" - AI for ") && title.includes(" in aviation"))).toBe(true);
    expect(amelia.some((title) => title.includes("PartsBase"))).toBe(true);
    expect(amelia.some((title) => title.includes("Airline Pilot Club"))).toBe(true);
  });

  it("keeps topic descriptions within 160 characters", () => {
    const segment = getSegment("aviation");
    for (const topic of segment?.topics ?? []) {
      expect(topic.intro.split(/[.!?]/).filter((part) => part.trim()).length).toBeGreaterThanOrEqual(2);
      expect(topicPageDescription(segment!.name, topic).length).toBeLessThanOrEqual(160);
      expect(capDescription(topic.intro).length).toBeLessThanOrEqual(160);
    }
  });

  it("publishes organization profiles and a dated article", () => {
    const organization = organizationJsonLd() as { sameAs: string[]; founder: { name: string }; logo: string };
    expect(organization.sameAs).toEqual([
      "https://x.com/Vizonixai",
      "https://www.linkedin.com/company/vizonix",
    ]);
    expect(organization.founder.name).toBe("Tyler Shewmake");
    expect(organization.logo).toContain("/logo.png");
    const issue = getIssue("aviation", "2026-10-16");
    const article = issueJsonLd(issue!, now) as {
      datePublished: string;
      dateModified: string;
      author: { name: string };
      image: string;
    };
    expect(article.datePublished).toBe("2026-10-16T12:00:00.000Z");
    expect(new Date(article.dateModified).getTime()).toBeLessThanOrEqual(now.getTime());
    expect(article.author.name).toBe("Tyler Shewmake");
    expect(article.image).toContain("/aviation/issues/2026-10-16/opengraph-image");
    const tool = listTools("aviation").find((entry) => entry.pricing === "Contact the vendor");
    expect(tool).toBeTruthy();
    expect(toolJsonLd(tool!)).not.toHaveProperty("offers");
  });
});
