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

  it("rejects an expired token", () => {
    const token = signToken(
      { email: "reader@firm.example", segment: "legal", purpose: "confirm" },
      secret,
      Date.parse("2026-10-01T00:00:00.000Z"),
    );
    expect(verifyToken(token, secret, "confirm", Date.parse("2026-10-14T00:00:00.000Z"))).toBeNull();
  });
});
