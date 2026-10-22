import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { resetInquiryLimits } from "@/lib/sponsor-inquiry";
import { signToken } from "@/lib/tokens";
import { TURNSTILE_TEST_SECRET } from "@/lib/turnstile";
import { TURNSTILE_TEST_TOKEN } from "@/lib/turnstile-public";

const envKeys = ["VERCEL_ENV", "TURNSTILE_SECRET_KEY", "TOKEN_SECRET", "NEXT_PUBLIC_SITE_URL"] as const;
const saved: Record<string, string | undefined> = {};

let octet = 20;

function request(path: string, body: unknown, ip?: string): Request {
  octet += 1;
  return new Request(`https://vizonix.com${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip ?? `198.51.100.${octet}`,
    },
    body: JSON.stringify(body),
  });
}

function signed(purpose: "preferences" | "confirm" | "unsubscribe"): string {
  return signToken({ email: "reader@example.com", segment: "aviation", purpose }, "route-secret");
}

beforeEach(() => {
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.VERCEL_ENV = "preview";
  process.env.TURNSTILE_SECRET_KEY = TURNSTILE_TEST_SECRET;
  process.env.TOKEN_SECRET = "route-secret";
  process.env.NEXT_PUBLIC_SITE_URL = "https://vizonix.com";
  resetRateLimits();
  resetInquiryLimits();
});

afterEach(() => {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("every public form route rejects a missing or invalid Turnstile token", () => {
  it("rejects subscribe", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const body = { email: "reader@example.com", segment: "aviation" };
    expect((await POST(request("/api/subscribe", body))).status).toBe(403);
    expect((await POST(request("/api/subscribe", { ...body, turnstileToken: "not-a-token" }))).status).toBe(403);
    expect((await POST(request("/api/subscribe", { ...body, turnstileToken: TURNSTILE_TEST_TOKEN }))).status).not.toBe(403);
  });

  it("rejects preference updates", async () => {
    const { POST } = await import("@/app/api/preferences/route");
    const body = { token: signed("preferences"), excludedSections: [] as string[] };
    expect((await POST(request("/api/preferences", body))).status).toBe(403);
    expect((await POST(request("/api/preferences", { ...body, turnstileToken: "not-a-token" }))).status).toBe(403);
  });

  it("rejects topic suggestions", async () => {
    const { POST } = await import("@/app/api/suggest/route");
    const body = { token: signed("preferences"), text: "Hangar robots" };
    expect((await POST(request("/api/suggest", body))).status).toBe(403);
    expect((await POST(request("/api/suggest", { ...body, turnstileToken: "not-a-token" }))).status).toBe(403);
  });

  it("rejects sponsor inquiries", async () => {
    const { POST } = await import("@/app/api/sponsor-inquiry/route");
    const body = {
      name: "Ada",
      company: "Hangar Co",
      email: "ada@hangar.example",
      promote: "A parts tool",
      message: "We would like a week.",
    };
    expect((await POST(request("/api/sponsor-inquiry", body))).status).toBe(403);
    expect((await POST(request("/api/sponsor-inquiry", { ...body, turnstileToken: "not-a-token" }))).status).toBe(403);
  });

  it("rejects sponsor checkout", async () => {
    const { POST } = await import("@/app/api/checkout/route");
    const body = {
      segment: "aviation",
      placement: "primary",
      startDate: "2027-01-04",
      email: "buyer@firm.example",
      quantity: 1,
    };
    expect((await POST(request("/api/checkout", body))).status).toBe(403);
    expect((await POST(request("/api/checkout", { ...body, turnstileToken: "not-a-token" }))).status).toBe(403);
  });

  it("rejects the confirmation form", async () => {
    const { POST } = await import("@/app/api/confirm/route");
    const body = { token: signed("confirm") };
    expect((await POST(request("/api/confirm", body))).status).toBe(403);
    expect((await POST(request("/api/confirm", { ...body, turnstileToken: "not-a-token" }))).status).toBe(403);
  });

  it("rejects the unsubscribe page form and still accepts a signed one-click POST", async () => {
    const { POST } = await import("@/app/api/unsubscribe/route");
    const token = signed("unsubscribe");
    const body = { token };
    expect((await POST(request("/api/unsubscribe", body))).status).toBe(403);
    expect((await POST(request("/api/unsubscribe", { ...body, turnstileToken: "not-a-token" }))).status).toBe(403);

    const oneClick = await POST(
      new Request(`https://vizonix.com/api/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "203.0.113.50" },
        body: new URLSearchParams({ "List-Unsubscribe": "One-Click" }),
      }),
    );
    expect(oneClick.status).not.toBe(403);
  });
});
