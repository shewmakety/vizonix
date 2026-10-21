import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { IssueBody } from "@/components/IssueBody";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";

describe("October 20 robotics notes", () => {
  it("adds one labeled robotics item to sections 01-07 and leaves The Ramp alone", () => {
    const issue = getIssue("aviation", "2026-10-20");
    expect(issue).toBeTruthy();
    if (!issue) return;
    expect(issue.subject).toBe(
      "When should a predictive alert ground an aircraft? Plus 7 places to put AI and robotics to work",
    );
    expect(issue.subject.length).toBeLessThanOrEqual(140);
    expect(issue.preheader.length).toBeLessThanOrEqual(200);
    expect(issue.preheader).toContain("hangar robots");
    expect(issue.lead.summary).toContain("robotics now showing up");

    const sections = issue.sections ?? [];
    expect(sections).toHaveLength(8);
    const withRobotics = sections.slice(0, 7);
    expect(withRobotics.every((section) => section.robotics)).toBe(true);
    expect(sections[7]?.robotics).toBeUndefined();
    expect(sections[7]?.topic).toBe("AI Productivity Tools");

    const html = renderToStaticMarkup(createElement(IssueBody, { issue }));
    const email = renderIssueEmail(issue, { mode: "broadcast" });
    const text = renderIssueText(issue, { mode: "broadcast" });
    expect(html.match(/robotics-label/g)).toHaveLength(7);
    expect(email.match(/>Robotics<\/span>/g)).toHaveLength(7);
    expect(text.match(/^ROBOTICS$/gm)).toHaveLength(7);
    expect(html).toContain("$ Why it pays:");
    expect(email).toContain("<strong>$ Why it pays:</strong>");

    const recruiting = withRobotics[0]?.robotics;
    expect(recruiting?.summary).toContain("workforce pipeline signal");
    expect(recruiting?.sourceUrl).toContain("wtoc.com");

    const predictive = withRobotics[2]?.robotics;
    expect(predictive?.summary).toContain("US Air Force");
    expect(predictive?.summary).toContain("Per Asylon");
    expect(predictive?.summary).toContain("LiDAR");
    expect(predictive?.summary).toContain("digital twin");

    const inspection = withRobotics[3]?.robotics;
    const stores = withRobotics[5]?.robotics;
    expect(inspection?.summary).toContain("robot arms");
    expect(inspection?.summary).toContain("83%");
    expect(inspection?.summary).not.toContain("Kardex");
    expect(stores?.summary).toContain("Kardex");
    expect(stores?.summary).toContain("AMRs");
    expect(stores?.summary).not.toContain("83%");
    expect(inspection?.sourceUrl).toBe(stores?.sourceUrl);

    const faa = withRobotics[4]?.robotics;
    expect(faa?.headline).toContain("FAA guidance");
    expect(faa?.summary).not.toMatch(/published/i);
    expect(faa?.sourceName).toBe("FAA");

    for (const section of withRobotics) {
      const item = section.robotics!;
      expect(html).toContain(item.headline.replaceAll("'", "&#x27;"));
      expect(html).toContain(`href="${item.sourceUrl}"`);
      expect(email).toContain(item.headline.replaceAll("'", "&#39;"));
      expect(email).toContain(`href="${item.sourceUrl}"`);
      expect(text).toContain(`Source: ${item.sourceName} (${item.sourceUrl})`);
      expect(text).toContain(`$ Why it pays: ${item.whyItMatters}`);
    }

    const joined = JSON.stringify(issue);
    expect(joined).not.toContain("AirlineHub");
    expect(joined).not.toContain("straitstimes.com");
    expect(joined).not.toContain("euronews.com");
    expect(issue.ramp?.posts.some((post) => post.handle.toLowerCase().includes("airlinehub"))).toBe(false);

    const terms = issue.glossary?.map((entry) => entry.term) ?? [];
    expect(terms).toContain("AMR");
    expect(terms).toContain("LiDAR");
    expect(terms).toContain("Digital twin");
    expect(terms).not.toContain("Cobot");
  });
});
