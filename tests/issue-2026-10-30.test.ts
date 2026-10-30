import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getIssue } from "../lib/content";
import { issueSchema } from "../lib/schema";

describe("Friday, October 30, 2026 aviation issue", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-30.json"), "utf8");

  it("is schema valid, has a glossary, and uses plain hyphens only", () => {
    const issue = getIssue("aviation", "2026-10-30");
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
      "AI assistant",
      "Automated compact bin storage",
      "Dynamic pricing",
      "Foreign object debris detection",
      "Intelligent document processing",
      "Level 4 autonomous driving",
      "Plugin",
      "Predictive maintenance",
      "Prescriptive maintenance",
    ]);
    expect(raw).not.toMatch(/[\u2013\u2014]/);
  });
});
