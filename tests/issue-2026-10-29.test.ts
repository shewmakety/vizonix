import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getIssue } from "../lib/content";
import { issueSchema } from "../lib/schema";

describe("Thursday, October 29, 2026 aviation issue", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-29.json"), "utf8");

  it("is schema valid, has a glossary, and uses plain hyphens only", () => {
    const issue = getIssue("aviation", "2026-10-29");
    expect(issueSchema.safeParse(JSON.parse(raw)).success).toBe(true);
    expect(issue?.sample).toBe(false);
    expect(issue?.subject.startsWith("The VIZONIX Daily")).toBe(false);
    expect(issue?.sections).toHaveLength(8);
    expect(issue?.sections?.map((section) => section.topic)).toEqual([
      "Recruiting",
      "Sales and marketing",
      "Predictive maintenance",
      "Maintenance activity optimization",
      "Troubleshooting support",
      "Warehousing",
      "AOG support: parts, rotables and technicians",
      "General AI Productivity Tools",
    ]);
    expect(issue?.sections?.at(-1)?.topic).toBe("General AI Productivity Tools");
    expect(issue?.ramp).toBeUndefined();
    expect(issue?.playbook).toBeUndefined();
    expect(issue?.quickLinks).toBeUndefined();
    expect(issue?.glossary?.map((entry) => entry.term)).toEqual([
      "AI agent",
      "AI pilot assistant",
      "Automated storage and retrieval system",
      "Cube storage",
      "Digital twin",
      "Level 2 assistance",
      "Plugin",
      "Video analytics",
    ]);
    expect(raw).not.toMatch(/[\u2013\u2014]/);
  });
});
