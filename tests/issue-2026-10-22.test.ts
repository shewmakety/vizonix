import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
import { getIssue } from "../lib/content";

describe("Thursday, October 22, 2026 aviation issue", () => {
  const raw = fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-22.json"), "utf8");

  it("ships robotics, a Ramp and plain hyphens only", () => {
    const issue = getIssue("aviation", "2026-10-22");
    expect(issue?.sample).toBe(false);
    expect(issue?.subject.toLowerCase()).toContain("robotics");
    expect(issue?.subject.startsWith("The VIZONIX Daily")).toBe(false);
    expect(issue?.sections?.filter((section) => section.robotics)).toHaveLength(1);
    expect(issue?.ramp?.posts).toHaveLength(4);
    expect(raw).not.toMatch(/[\u2013\u2014]/);
    expect(raw).not.toContain("hello@");
    expect(raw).not.toContain("with no more than three sponsors in any issue");
  });
});
