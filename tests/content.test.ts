import { describe, expect, it } from "vitest";
import { getIssue, listIssues, listTools } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { issueSchema } from "@/lib/schema";
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
  });

  it("loads a labeled aviation sample issue and labeled sample tools", () => {
    const issues = listIssues("aviation");
    expect(issues).toHaveLength(1);
    expect(issues[0].sample).toBe(true);
    expect(issues[0].date).toBe("2026-10-14");
    expect(issues[0].sponsors.primary?.name).toBe("Holdshort Systems");
    expect(issues[0].sponsors.primary?.sample).toBe(true);
    expect(issues[0].sponsors.secondary).toBeNull();
    expect(issues[0].sponsors.classified).toBeNull();

    const tools = listTools("aviation");
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools.every((tool) => tool.sample)).toBe(true);
    expect(getIssue("aviation", "2026-10-14")?.tools.map((tool) => tool.slug)).toEqual([
      "aogline",
      "baywright",
      "stockramp",
    ]);
    expect(tools.map((tool) => tool.slug)).toContain("dutyline");
  });

  it("keeps the legal sample issue and tools", () => {
    const issues = listIssues("legal");
    expect(issues).toHaveLength(1);
    expect(issues[0].sample).toBe(true);
    expect(issues[0].sponsors.primary?.sample).toBe(true);
    const tools = listTools("legal");
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools.every((tool) => tool.sample)).toBe(true);
    expect(getIssue("legal", "2026-10-14")?.tools.map((tool) => tool.slug)).toContain("clauseharbor");
  });

  it("renders each section with its own payoff line and the three sponsor slots", () => {
    const aviation = getIssue("aviation", "2026-10-14");
    const legal = getIssue("legal", "2026-10-14");
    expect(aviation).toBeTruthy();
    expect(legal).toBeTruthy();
    if (!aviation || !legal) return;

    const html = renderIssueEmail(aviation, { mode: "broadcast" });
    const text = renderIssueText(aviation, { mode: "test" });
    expect(html).toContain("Primary sponsor");
    expect(html).toContain("Secondary sponsor");
    expect(html).toContain("Classified");
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("Holdshort Systems");
    expect(html).toContain("Why it can make the operation money.");
    expect(html).not.toContain("Why it can make the practice money.");
    expect(text).toContain("PRIMARY SPONSOR");
    expect(text).toContain("SECONDARY SPONSOR");
    expect(text).toContain("CLASSIFIED");
    expect(text.indexOf("PRIMARY SPONSOR")).toBeLessThan(text.indexOf("SECONDARY SPONSOR"));
    expect(text.indexOf("SECONDARY SPONSOR")).toBeLessThan(text.indexOf("CLASSIFIED"));
    expect(text).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).not.toMatch(/[\u2013\u2014]/);

    const legalHtml = renderIssueEmail(legal, { mode: "test" });
    expect(legalHtml).toContain("Why it can make the practice money.");
    expect(legalHtml).toContain("Northline Systems");
  });

  it("rejects sponsor copy that is longer than the rate card ceiling", () => {
    const issue = getIssue("aviation", "2026-10-14");
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
