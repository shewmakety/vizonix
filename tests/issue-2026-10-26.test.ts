import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getIssue } from "../lib/content";
import { issueSchema } from "../lib/schema";

describe("Monday, October 26, 2026 aviation issue", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-26.json"), "utf8");

  it("is schema valid, has a glossary, and uses plain hyphens only", () => {
    const issue = getIssue("aviation", "2026-10-26");
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
      "AI speech translation",
      "Computer vision",
      "Large language model",
      "Machine learning model",
      "Physical AI",
      "Probabilistic modeling",
      "Reinforcement learning",
      "Vision-language-action model",
      "World action model",
    ]);
    expect(raw).not.toMatch(/[\u2013\u2014]/);
  });
});
