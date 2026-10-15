import { describe, expect, it } from "vitest";
import { getIssue, listIssues, listTools } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { issueSchema, issueTools } from "@/lib/schema";
import { directoryViewFromQuery } from "@/lib/directory-view";
import { featuredSegment, segments } from "@/lib/segments";

describe("segment config and sample content", () => {
  it("lists aviation first, with legal live and two sections still planned", () => {
    expect(segments.map((segment) => segment.slug)).toEqual([
      "aviation",
      "legal",
      "warehousing",
      "marketing-sales",
    ]);
    expect(featuredSegment().slug).toBe("aviation");
    expect(segments.find((segment) => segment.slug === "aviation")?.status).toBe("active");
    expect(segments.find((segment) => segment.slug === "legal")?.status).toBe("active");
    expect(segments.filter((segment) => segment.status === "planned")).toHaveLength(2);
    expect(segments.find((segment) => segment.slug === "aviation")?.payoffLabel).toBe(
      "Why it can make the operation money",
    );
    expect(segments.find((segment) => segment.slug === "legal")?.payoffLabel).toBe(
      "Why it can make the practice money",
    );
    expect(segments.find((segment) => segment.slug === "aviation")?.audience).toBe(
      "Airlines, MROs, parts suppliers, operators, and maintenance / AOG teams",
    );
    expect(segments.find((segment) => segment.slug === "aviation")?.summary).toContain(
      "maintenance / AOG teams",
    );
    expect(segments.find((segment) => segment.slug === "aviation")?.summary).not.toContain(
      "maintenance and AOG",
    );
    expect(directoryViewFromQuery(undefined)).toBe("cards");
    expect(directoryViewFromQuery("cards")).toBe("cards");
    expect(directoryViewFromQuery("list")).toBe("list");
    expect(directoryViewFromQuery(["list"])).toBe("list");
    expect(directoryViewFromQuery("grid")).toBe("cards");
  });

  it("loads the first real aviation issue and real tool pages", () => {
    const issues = listIssues("aviation");
    expect(issues).toHaveLength(1);
    expect(issues[0].sample).toBe(false);
    expect(issues[0].date).toBe("2026-10-16");
    expect(issues[0].sponsors.primary?.name).toBe("Vizonix");
    expect(issues[0].sponsors.primary?.house).toBe(true);
    expect(issues[0].sponsors.primary?.sample).toBe(false);
    expect(issues[0].sponsors.primary?.ctaUrl).toBe("https://www.vizonix.com/sponsor");
    expect(issues[0].sponsors.secondary).toBeNull();
    expect(issues[0].sponsors.classified).toBeNull();
    expect(issues[0].sections).toHaveLength(7);
    expect(issues[0].sections?.some((section) => section.coverageNote)).toBe(true);
    expect(issueTools(issues[0])).toHaveLength(12);
    expect(issueTools(issues[0]).map((tool) => tool.slug)).toContain("airvoyant");
    expect(issueTools(issues[0]).map((tool) => tool.slug)).not.toContain("aogline");

    const tools = listTools("aviation");
    expect(tools).toHaveLength(12);
    expect(tools.every((tool) => tool.sample === false)).toBe(true);
    expect(tools.every((tool) => tool.pricing === "Contact the vendor")).toBe(true);
    for (const slug of ["aogline", "baywright", "stockramp", "dutyline"]) {
      expect(tools.map((tool) => tool.slug)).not.toContain(slug);
    }
    expect(getIssue("aviation", "2026-10-14")).toBeUndefined();
  });

  it("keeps the legal sample issue and tools", () => {
    const issues = listIssues("legal");
    expect(issues).toHaveLength(1);
    expect(issues[0].sample).toBe(true);
    expect(issues[0].sponsors.primary?.sample).toBe(true);
    const tools = listTools("legal");
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools.every((tool) => tool.sample)).toBe(true);
    expect(getIssue("legal", "2026-10-14")?.tools?.map((tool) => tool.slug)).toContain("clauseharbor");
  });

  it("renders each section with its own payoff line and the three sponsor slots", () => {
    const aviation = getIssue("aviation", "2026-10-16");
    const legal = getIssue("legal", "2026-10-14");
    expect(aviation).toBeTruthy();
    expect(legal).toBeTruthy();
    if (!aviation || !legal) return;

    const html = renderIssueEmail(aviation, { mode: "broadcast" });
    const text = renderIssueText(aviation, { mode: "test" });
    expect(html).toContain("Primary sponsor - open");
    expect(html).toContain("Secondary sponsor");
    expect(html).toContain("Classified");
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("See founding sponsor rates");
    expect(html).toContain("https://www.vizonix.com/sponsor");
    expect(html).toContain("Recruiting pilots and technicians");
    expect(html).toContain("Thin this week: we did not find a verified, aviation-specific AI recruiting launch");
    expect(html).toContain("https://www.atec-amt.org/news/aviation-technical-workforce-expansion-continues-amid-strong-demand");
    expect(html).toContain("Why it can make the operation money.");
    expect(html).not.toContain("Why it can make the practice money.");
    expect(html).not.toContain("Holdshort Systems");
    expect(html).not.toContain("Sample issue");
    expect(text).toContain("PRIMARY SPONSOR");
    expect(text).toContain("SECONDARY SPONSOR");
    expect(text).toContain("CLASSIFIED");
    expect(text.indexOf("PRIMARY SPONSOR")).toBeLessThan(text.indexOf("SECONDARY SPONSOR"));
    expect(text.indexOf("SECONDARY SPONSOR")).toBeLessThan(text.indexOf("CLASSIFIED"));
    expect(text).toContain("One standout this week.");
    expect(text).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).not.toMatch(/[\u2013\u2014]/);
    expect(text).not.toMatch(/[\u2013\u2014]/);

    const legalHtml = renderIssueEmail(legal, { mode: "test" });
    const legalText = renderIssueText(legal, { mode: "test" });
    expect(legalHtml).toContain("Why it can make the practice money.");
    expect(legalHtml).toContain("Northline Systems");
    expect(legalHtml).toContain("Tool Highlights");
    expect(legalText).toContain("TOOL HIGHLIGHTS");
  });

  it("rejects sponsor copy that is longer than the rate card ceiling", () => {
    const issue = getIssue("aviation", "2026-10-16");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const tooLong = {
      ...issue,
      sponsors: {
        ...issue.sponsors,
        classified: {
          name: "Too Long",
          url: "/sponsor",
          copy: Array.from({ length: 40 }, () => "word").join(" "),
          cta: "Go",
          ctaUrl: "/sponsor",
        },
      },
    };
    expect(issueSchema.safeParse(tooLong).success).toBe(false);
  });
});
