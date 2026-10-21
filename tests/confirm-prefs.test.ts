import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "@/lib/tokens";

const resend = vi.hoisted(() => ({
  send: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  add: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.send };
    contacts = {
      get: resend.get,
      update: resend.update,
      segments: { add: resend.add },
    };
  },
}));

import { confirmSubscription } from "@/lib/subscribe";

const envKeys = [
  "TOKEN_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "RESEND_SEGMENT_ID_AVIATION",
  "NEXT_PUBLIC_SITE_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.TOKEN_SECRET = "confirm-prefs-secret";
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
  process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
  process.env.NEXT_PUBLIC_SITE_URL = "https://vizonix.com";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  resend.send.mockReset();
  resend.get.mockReset();
  resend.update.mockReset();
  resend.add.mockReset();
  resend.get.mockResolvedValue({ data: { unsubscribed: true }, error: null });
  resend.update.mockResolvedValue({ data: { id: "contact" }, error: null });
  resend.add.mockResolvedValue({ data: { id: "membership" }, error: null });
  resend.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("confirm stores pending choices", () => {
  it("writes the exclusion list and suggestion only after the token is accepted", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const token = signToken(
      {
        email: "reader@example.com",
        segment: "aviation",
        purpose: "confirm",
        excluded: ["Recruiting"],
        suggestion: "Hangar robots",
        source: "linkedin",
      },
      "confirm-prefs-secret",
    );
    const result = await confirmSubscription(token);
    expect(result.ok).toBe(true);
    const bodies = fetchMock.mock.calls.map((call) =>
      JSON.parse(String((call as unknown as [string, RequestInit])[1].body)) as Record<string, unknown>,
    );
    const prefs = bodies.find((body) => Array.isArray(body.excluded_sections));
    const suggestion = bodies.find((body) => body.text === "Hangar robots");
    expect(prefs).toMatchObject({
      email: "reader@example.com",
      segment: "aviation",
      excluded_sections: ["Recruiting"],
      source: "linkedin",
    });
    expect(suggestion).toMatchObject({
      email: "reader@example.com",
      segment: "aviation",
      source: "linkedin",
      status: "new",
    });
  });

  it("leaves storage alone for a confirm link that has no picker payload", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const token = signToken(
      { email: "reader@example.com", segment: "aviation", purpose: "confirm" },
      "confirm-prefs-secret",
    );
    const result = await confirmSubscription(token);
    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
