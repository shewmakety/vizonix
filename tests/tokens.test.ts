import { describe, expect, it } from "vitest";
import { signToken, verifyToken } from "@/lib/tokens";

const secret = "test-secret";

describe("signed links", () => {
  it("round-trips a confirm token and rejects tampering", () => {
    const token = signToken(
      { email: "Reader@Firm.Example", segment: "legal", purpose: "confirm" },
      secret,
      Date.parse("2026-10-14T12:00:00.000Z"),
    );
    const payload = verifyToken(token, secret, "confirm", Date.parse("2026-10-14T13:00:00.000Z"));
    expect(payload?.email).toBe("reader@firm.example");
    expect(payload?.segment).toBe("legal");

    const [body, signature] = token.split(".");
    expect(verifyToken(`${body}.${signature}x`, secret, "confirm")).toBeNull();
    expect(verifyToken(token, secret, "unsubscribe")).toBeNull();
    expect(verifyToken(token, "other-secret", "confirm")).toBeNull();
  });

  it("keeps signup choices on a confirm token and signs a preferences link", () => {
    const now = Date.parse("2026-10-21T12:00:00.000Z");
    const token = signToken(
      {
        email: "Reader@Hangar.Example",
        segment: "aviation",
        purpose: "confirm",
        pending: { excluded: ["Warehousing"], suggestion: "Hangar robots", source: "linkedin" },
      },
      secret,
      now,
    );
    const payload = verifyToken(token, secret, "confirm", now + 1000);
    expect(payload?.email).toBe("reader@hangar.example");
    expect(payload?.pending).toEqual({
      excluded: ["Warehousing"],
      suggestion: "Hangar robots",
      source: "linkedin",
    });
    expect(verifyToken(token, secret, "preferences", now + 1000)).toBeNull();

    const preferences = signToken(
      { email: "reader@hangar.example", segment: "aviation", purpose: "preferences", pending: { excluded: ["Warehousing"] } },
      secret,
      now,
    );
    const managed = verifyToken(preferences, secret, "preferences", now + 1000);
    expect(managed?.email).toBe("reader@hangar.example");
    expect(managed?.pending).toBeUndefined();
    expect(verifyToken(preferences, secret, "preferences", now + 1000 * 60 * 60 * 24 * 181)).toBeNull();
  });

  it("rejects an expired token", () => {
    const token = signToken(
      { email: "reader@firm.example", segment: "legal", purpose: "confirm" },
      secret,
      Date.parse("2026-10-01T00:00:00.000Z"),
    );
    expect(verifyToken(token, secret, "confirm", Date.parse("2026-10-14T00:00:00.000Z"))).toBeNull();
  });
});
