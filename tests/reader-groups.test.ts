import { describe, expect, it } from "vitest";
import { getIssue } from "@/lib/content";
import { issueSections, productivitySectionTopic } from "@/lib/schema";
import {
  applyReaderLinks,
  PREFERENCES_URL_MARKER,
  renderIssueEmail,
  renderIssueText,
  UNSUBSCRIBE_URL_MARKER,
} from "@/lib/email";
import {
  assertTargetedOnce,
  groupSubscribersByExclusion,
  includedFromExcluded,
  OPTIONAL_AVIATION_SECTIONS,
  parseExcluded,
  parseIncluded,
} from "@/lib/reader-topics";
import { listIssues } from "@/lib/content";

describe("reader groups", () => {
  it("lists every section that a published aviation issue uses", () => {
    const topics = new Set<string>();
    for (const issue of listIssues("aviation")) {
      if (issue.sample) continue;
      for (const section of issueSections(issue)) {
        if (section.topic) topics.add(section.topic);
      }
    }
    expect([...topics].sort()).toEqual([...OPTIONAL_AVIATION_SECTIONS].sort());
    expect(OPTIONAL_AVIATION_SECTIONS.at(-1)).toBe(productivitySectionTopic);
  });

  it("groups identical exclusions and gives readers without prefs the full issue", () => {
    const plan = groupSubscribersByExclusion(
      ["a@hangar.example", "B@hangar.example", "a@hangar.example", "c@hangar.example", "d@hangar.example"],
      [
        { email: "b@hangar.example", excludedSections: ["Warehousing"] },
        { email: "c@hangar.example", excludedSections: ["warehousing"] },
        { email: "d@hangar.example", excludedSections: ["Recruiting", "Recruiting"] },
      ],
    );
    expect(plan.confirmed).toEqual([
      "a@hangar.example",
      "b@hangar.example",
      "c@hangar.example",
      "d@hangar.example",
    ]);
    expect(plan.groups).toEqual([
      { excluded: [], emails: ["a@hangar.example"] },
      { excluded: ["Warehousing"], emails: ["b@hangar.example", "c@hangar.example"] },
      { excluded: ["Recruiting"], emails: ["d@hangar.example"] },
    ]);
    expect(() => assertTargetedOnce(plan.confirmed, plan.groups)).not.toThrow();
  });

  it("rejects a plan that skips or repeats a confirmed subscriber", () => {
    expect(() =>
      assertTargetedOnce(
        ["a@hangar.example", "b@hangar.example"],
        [{ excluded: [], emails: ["a@hangar.example", "a@hangar.example"] }],
      ),
    ).toThrow(/more than once/);
    expect(() =>
      assertTargetedOnce(["a@hangar.example", "b@hangar.example"], [{ excluded: [], emails: ["a@hangar.example"] }]),
    ).toThrow(/missed|expected/);
  });

  it("turns unchecked sections into the excluded list", () => {
    const parsed = parseIncluded(["Recruiting", "Predictive maintenance"]);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.excluded).toContain("Warehousing");
    expect(parsed.excluded).not.toContain("Recruiting");
    expect(includedFromExcluded(parsed.excluded)).toEqual(["Recruiting", "Predictive maintenance"]);
    expect(parseExcluded(["Not a section"]).ok).toBe(false);
    expect(parseExcluded([]).ok).toBe(true);
  });

  it("omits an excluded section, renumbers the rest, and adds a manage link", () => {
    const issue = getIssue("aviation", "2026-10-21");
    expect(issue).toBeTruthy();
    const email = renderIssueEmail(issue!, { mode: "personal", excludedSections: ["Recruiting"] });
    const text = renderIssueText(issue!, { mode: "personal", excludedSections: ["Recruiting"] });
    expect(email).not.toContain(">Recruiting</td>");
    expect(text).not.toContain("RECRUITING");
    expect(email).toContain(">Sales and marketing</td>");
    const sales = email.indexOf(">Sales and marketing</td>");
    const number = email.lastIndexOf(">01</td>", sales);
    expect(number).toBeGreaterThan(-1);
    expect(sales - number).toBeLessThan(500);
    expect(email).toContain("The Ramp");
    expect(email).toContain("Primary sponsor");
    expect(email).toContain("Manage your topics");
    expect(email).toContain(PREFERENCES_URL_MARKER);
    expect(email).toContain(UNSUBSCRIBE_URL_MARKER);
    const linked = applyReaderLinks(email, {
      preferencesUrl: "https://vizonix.com/preferences?token=abc",
      unsubscribeUrl: "https://vizonix.com/aviation/unsubscribe?token=def",
    });
    expect(linked).toContain("https://vizonix.com/preferences?token=abc");
    expect(linked).not.toContain(PREFERENCES_URL_MARKER);
    expect(text).toContain("Manage your topics:");
  });
});
