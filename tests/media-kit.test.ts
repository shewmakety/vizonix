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
    expect(text).toContain("$300");
    expect(text).toContain("$175");
    expect(text).toContain("Section sponsor");
    expect(text).toContain("Quote");
    expect(text).not.toContain("$100");
    expect(text).not.toContain("$75");
    expect(text).not.toContain("Featured tool listing");
    expect(text).not.toContain("Section site banner");
    expect(text).not.toMatch(/\d+% open/);
    expect(text.toLowerCase()).not.toContain("logo");
    expect(text.toLowerCase()).not.toContain("call to action");
    expect(text).not.toMatch(/\b(?:warehousing|legal|marketing)\b/i);
  });
});
