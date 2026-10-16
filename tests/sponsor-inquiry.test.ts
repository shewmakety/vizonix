import { describe, expect, it } from "vitest";
import { allowInquiry, parseInquiry, resetInquiryLimits } from "@/lib/sponsor-inquiry";

describe("sponsor inquiry", () => {
  it("accepts a complete note and hides the honeypot", () => {
    const parsed = parseInquiry({
      name: "Ada",
      company: "Hangar Co",
      email: "Ada@Hangar.Example",
      promote: "A parts search tool",
      budget: "$150 to $300",
      message: "We would like the founding Featured listing.",
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.honeypot).toBe(false);
      expect(parsed.value.email).toBe("ada@hangar.example");
    }

    const bot = parseInquiry({ company_website: "https://spam.example", email: "nope" });
    expect(bot.ok).toBe(true);
    if (bot.ok) expect(bot.value.honeypot).toBe(true);
  });

  it("rejects an unknown budget and limits repeats from one address", () => {
    const bad = parseInquiry({
      name: "Ada",
      company: "Hangar Co",
      email: "ada@hangar.example",
      promote: "A tool",
      budget: "$1",
      message: "Hello",
    });
    expect(bad.ok).toBe(false);

    resetInquiryLimits();
    const now = Date.parse("2026-10-16T12:00:00.000Z");
    for (let index = 0; index < 5; index += 1) {
      expect(allowInquiry("203.0.113.8", now + index)).toBe(true);
    }
    expect(allowInquiry("203.0.113.8", now + 6)).toBe(false);
    expect(allowInquiry("203.0.113.9", now + 6)).toBe(true);
  });
});
