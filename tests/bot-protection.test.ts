import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimits } from "@/lib/rate-limit";
import { verifyTurnstile, TURNSTILE_TEST_SECRET } from "@/lib/turnstile";
import { TURNSTILE_TEST_TOKEN } from "@/lib/turnstile-public";
import { getIssue } from "@/lib/content";
import { renderIssueEmail, renderIssueText } from "@/lib/email";

const envKeys = ["VERCEL_ENV", "TURNSTILE_SECRET_KEY", "NEXT_PUBLIC_TURNSTILE_SITE_KEY", "NEXT_PUBLIC_SITE_URL"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.VERCEL_ENV = "preview";
  process.env.TURNSTILE_SECRET_KEY = TURNSTILE_TEST_SECRET;
  process.env.NEXT_PUBLIC_SITE_URL = "https://vizonix.com";
  resetRateLimits();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

function request(body: unknown, ip = "198.51.100.20"): Request {
  return new Request("https://vizonix.com/api/subscribe", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("turnstile and signup limits", () => {
  it("accepts the documented test token outside production and blocks a missing secret in production", async () => {
    const passed = await verifyTurnstile({ token: TURNSTILE_TEST_TOKEN, action: "signup", remoteip: "198.51.100.8" });
    expect(passed.ok).toBe(true);
    const rejected = await verifyTurnstile({ token: "not-the-dummy", action: "signup" });
    expect(rejected.ok).toBe(false);

    process.env.VERCEL_ENV = "production";
    delete process.env.TURNSTILE_SECRET_KEY;
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const closed = await verifyTurnstile({ token: TURNSTILE_TEST_TOKEN, action: "signup" });
    expect(closed).toMatchObject({ ok: false, status: 503 });
    expect(error.mock.calls.flat().join(" ")).toContain("TURNSTILE_SECRET_KEY is not set");

    process.env.TURNSTILE_SECRET_KEY = TURNSTILE_TEST_SECRET;
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "1x00000000000000000000AA";
    const testKey = await verifyTurnstile({ token: TURNSTILE_TEST_TOKEN, action: "signup" });
    expect(testKey).toMatchObject({ ok: false, status: 503 });
    expect(error.mock.calls.flat().join(" ")).toContain("Cloudflare test secret");
  });

  it("checks the action and hostname when the secret is real", async () => {
    process.env.TURNSTILE_SECRET_KEY = "real-turnstile-secret";
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "real-site-key";
    const fetchMock = vi.fn(async () =>
      Response.json({ success: true, action: "signup", hostname: "www.vizonix.com" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const ok = await verifyTurnstile({ token: "real-token", action: "signup", remoteip: "203.0.113.10" });
    expect(ok.ok).toBe(true);
    const body = String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body);
    expect(body).toContain("secret=real-turnstile-secret");
    expect(body).toContain("remoteip=203.0.113.10");
    const wrongAction = await verifyTurnstile({ token: "real-token", action: "suggest" });
    expect(wrongAction.ok).toBe(false);
  });

  it("rate limits subscribe, ignores the honeypot, and requires a Turnstile token", async () => {
    const { POST } = await import("@/app/api/subscribe/route");
    const honeypot = await POST(request({ email: "bot@example.com", segment: "aviation", company_website: "https://spam.example" }));
    expect(honeypot.status).toBe(200);

    const missing = await POST(request({ email: "reader@example.com", segment: "aviation" }, "198.51.100.21"));
    expect(missing.status).toBe(403);

    const verified = await POST(
      request(
        { email: "reader@example.com", segment: "aviation", turnstileToken: TURNSTILE_TEST_TOKEN },
        "198.51.100.22",
      ),
    );
    expect(verified.status).toBe(503);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await POST(request({ email: "reader@example.com" }, "198.51.100.23"));
    }
    const limited = await POST(request({ email: "reader@example.com" }, "198.51.100.23"));
    expect(limited.status).toBe(429);
  });

  it("puts the customize line in the header and points the email link at the signed manage URL", () => {
    const issue = getIssue("aviation", "2026-10-21");
    expect(issue).toBeTruthy();
    if (!issue) return;
    const signed = "https://vizonix.com/preferences?token=reader-topics";
    const email = renderIssueEmail(issue, { mode: "test", preferencesUrl: signed });
    const text = renderIssueText(issue, { mode: "test", preferencesUrl: signed });
    expect(email.split(signed).length - 1).toBeGreaterThanOrEqual(3);
    expect(text.split(signed).length - 1).toBeGreaterThanOrEqual(3);
    expect(email).not.toContain("Pick your topics - get only the sections you care about");
    expect(email.indexOf(">READ ON WEB<")).toBeLessThan(email.indexOf(`href="${signed}"`));
    expect(text.indexOf(`CUSTOMIZE: ${signed}`)).toBeLessThan(text.indexOf(issue.lead.title));
    expect(text).not.toContain("Customize your issue:");
  });
});
