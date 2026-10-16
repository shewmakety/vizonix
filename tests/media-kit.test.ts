import { describe, expect, it } from "vitest";
import { latestPublishedIssue } from "@/lib/content";
import { audienceNumbersLine, mediaKitPdf } from "@/lib/media-kit";

describe("media kit", () => {
  it("states the audience line and the live issue without inventing a metric", () => {
    expect(audienceNumbersLine).toBe("Audience numbers will be published after our first full month.");
    const latest = latestPublishedIssue("aviation");
    expect(latest?.sample).toBe(false);
    const pdf = Buffer.from(mediaKitPdf());
    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain(audienceNumbersLine);
    expect(text).toContain("Tyler Shewmake");
    expect(text).toContain("AOG Alerts");
    expect(text).toContain(`/aviation/issues/${latest?.date}`);
    expect(text).toContain("$175");
    expect(text).toContain("$100");
    expect(text).toContain("$75");
    expect(text).not.toMatch(/\d+% open/);
  });
});
