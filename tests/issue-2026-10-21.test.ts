import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getIssue } from "../lib/content";

describe("Wednesday, October 21, 2026 aviation issue", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-21.json"), "utf8");

  it("ships robotics, a Ramp and plain hyphens only", () => {
    const issue = getIssue("aviation", "2026-10-21");
    expect(issue?.sample).toBe(false);
    expect(issue?.subject.toLowerCase()).toContain("robotics");
    expect(issue?.subject.startsWith("The VIZONIX Daily")).toBe(false);
    expect(issue?.sections?.filter((section) => section.robotics)).toHaveLength(6);
    expect(issue?.ramp?.posts).toHaveLength(4);
    expect(raw).not.toMatch(/[\u2013\u2014]/);
    expect(raw).not.toContain("hello@");
  });
});
