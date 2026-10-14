import { describe, expect, it } from "vitest";
import { getIssue, listIssues, listTools } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { issueSchema } from "@/lib/schema";
import { segments } from "@/lib/segments";

describe("legal sample content", () => {
  it("keeps three sections in config, with legal live", () => {
    expect(segments.map((segment) => segment.slug)).toEqual([
      "legal",
      "warehousing",
      "marketing-sales",
    ]);
    expect(segments.find((segment) => segment.slug === "legal")?.status).toBe("active");
    expect(segments.filter((segment) => segment.status === "planned")).toHaveLength(2);
  });

  it("loads a labeled sample issue and labeled sample tools", () => {
    const issues = listIssues("legal");
    expect(issues).toHaveLength(1);
    expect(issues[0].sample).toBe(true);
    expect(issues[0].date).toBe("2026-10-14");
    expect(issues[0].sponsors.primary?.sample).toBe(true);
    expect(issues[0].sponsors.secondary).toBeNull();
    expect(issues[0].sponsors.classified).toBeNull();

    const tools = listTools("legal");
    expect(tools.length).toBeGreaterThanOrEqual(4);
    expect(tools.every((tool) => tool.sample)).toBe(true);
    expect(getIssue("legal", "2026-10-14")?.tools.map((tool) => tool.slug)).toContain("clauseharbor");
  });

  it("renders primary, secondary, and classified slots", () => {
    const issue = getIssue("legal", "2026-10-14");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const html = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "test" });
    expect(html).toContain("Primary sponsor");
    expect(html).toContain("Secondary sponsor");
    expect(html).toContain("Classified");
    expect(html).toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).toContain("Northline Systems");
    expect(text).toContain("PRIMARY SPONSOR");
    expect(text).toContain("SECONDARY SPONSOR");
    expect(text).toContain("CLASSIFIED");
    expect(text.indexOf("PRIMARY SPONSOR")).toBeLessThan(text.indexOf("SECONDARY SPONSOR"));
    expect(text.indexOf("SECONDARY SPONSOR")).toBeLessThan(text.indexOf("CLASSIFIED"));
    expect(text).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });

  it("rejects sponsor copy that is longer than the rate card ceiling", () => {
    const issue = getIssue("legal", "2026-10-14");
    expect(issue).toBeTruthy();
    if (!issue || !issue.sponsors.classified && issue) {
      const tooLong = {
        ...issue!,
        sponsors: {
          ...issue!.sponsors,
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
    }
  });
});
