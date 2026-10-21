import { describe, expect, it } from "vitest";
import { getIssue } from "@/lib/content";
import { renderIssueEmail } from "@/lib/email";
import {
  assertTargetedOnce,
  groupSubscribers,
  planIssueDelivery,
  sectionsForReader,
} from "@/lib/personalize";
import { parseExcluded } from "@/lib/reader-sections";

describe("reader groups", () => {
  it("puts identical exclusion sets in one group and gives everyone else the full issue", () => {
    const groups = planIssueDelivery(
      ["A@example.com", "b@example.com", "a@example.com", "c@example.com", ""],
      [
        { email: "a@example.com", excludedSections: ["Warehousing", "Recruiting"] },
        { email: "B@example.com", excludedSections: ["Recruiting", "Warehousing"] },
        { email: "c@example.com", excludedSections: [] },
        { email: "outsider@example.com", excludedSections: ["Recruiting"] },
      ],
    );

    expect(groups).toHaveLength(2);
    const full = groups.find((group) => group.excluded.length === 0);
    const trimmed = groups.find((group) => group.excluded.length > 0);
    expect(full?.emails).toEqual(["c@example.com"]);
    expect(trimmed?.excluded).toEqual(["Recruiting", "Warehousing"]);
    expect(trimmed?.emails).toEqual(["a@example.com", "b@example.com"]);
  });

  it("rejects a plan that drops or repeats a confirmed subscriber", () => {
    expect(() =>
      assertTargetedOnce(["a@example.com", "b@example.com"], [
        { excluded: [], key: "", emails: ["a@example.com"] },
      ]),
    ).toThrow(/exactly once/);
    expect(() =>
      assertTargetedOnce(["a@example.com"], [
        { excluded: [], key: "", emails: ["a@example.com", "a@example.com"] },
      ]),
    ).toThrow(/duplicate 1/);
    expect(groupSubscribers(["a@example.com", "a@example.com"], []).flatMap((group) => group.emails)).toEqual([
      "a@example.com",
    ]);
  });

  it("omits excluded topic sections and keeps the top story, The Ramp, and sponsor slots", () => {
    const issue = getIssue("aviation", "2026-10-20");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const unknown = parseExcluded(["Not a section"]);
    expect(unknown.ok).toBe(false);
    const renamed = parseExcluded(["AI Productivity Tools"]);
    expect(renamed.ok).toBe(true);
    if (renamed.ok) expect(renamed.excluded).toEqual(["General AI Productivity Tools"]);
    const parsed = parseExcluded([" Warehousing ", "Recruiting"]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    const sections = sectionsForReader(issue, parsed.excluded);
    expect(sections.map((section) => section.topic)).not.toContain("Recruiting");
    expect(sections.map((section) => section.topic)).not.toContain("Warehousing");
    expect(sections.map((section) => section.topic)).toContain("Sales and marketing");

    const html = renderIssueEmail(issue, { mode: "test", excludedSections: parsed.excluded });
    expect(html).not.toContain(">Recruiting</td>");
    expect(html).not.toContain(">Warehousing</td>");
    expect(html).toContain(">Sales and marketing</td>");
    expect(html).toContain("The Ramp");
    expect(html).toContain("Top story");
    expect(html).toContain("Primary sponsor");
    expect(html).toContain("Manage your topics");
    expect(html).not.toMatch(/[\u2013\u2014]/);
  });
});
