import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "@/lib/tokens";
import { READER_WRITE_LIMIT, resetRateLimits } from "@/lib/rate-limit";

const fetchMock = vi.hoisted(() => vi.fn());
const resend = vi.hoisted(() => ({
  send: vi.fn(async () => ({ data: { id: "email_1" }, error: null })),
  get: vi.fn(async () => ({ data: { unsubscribed: true }, error: null })),
  update: vi.fn(async () => ({ data: { id: "contact" }, error: null })),
  add: vi.fn(async () => ({ data: { id: "membership" }, error: null })),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.send };
    contacts = {
      get: resend.get,
      update: resend.update,
      create: vi.fn(),
      segments: { add: resend.add },
    };
  },
}));

import { POST as savePreferences } from "@/app/api/preferences/route";
import { POST as suggestTopic } from "@/app/api/suggest/route";
import { confirmSubscription } from "@/lib/subscribe";

const envKeys = ["TOKEN_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "RESEND_API_KEY", "EMAIL_FROM", "RESEND_SEGMENT_ID_AVIATION"] as const;
const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function request(path: string, body: unknown): Request {
  return new Request(`https://vizonix.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.10" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  resetRateLimits();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  process.env.TOKEN_SECRET = "preferences-test-secret";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.RESEND_SEGMENT_ID_AVIATION;
});

afterEach(() => {
  resetRateLimits();
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("preference routes", () => {
  it("rejects a bad token, an unsubscribe token, and a section that is not on the list", async () => {
    const missing = await savePreferences(request("/api/preferences", { token: "nope", excludedSections: [] }));
    expect(missing.status).toBe(400);
    const unsubscribe = signToken(
      { email: "reader@hangar.example", segment: "aviation", purpose: "unsubscribe" },
      "preferences-test-secret",
    );
    const wrongPurpose = await savePreferences(
      request("/api/preferences", { token: unsubscribe, excludedSections: [] }),
    );
    expect(wrongPurpose.status).toBe(400);
    const preferences = signToken(
      { email: "reader@hangar.example", segment: "aviation", purpose: "preferences" },
      "preferences-test-secret",
    );
    const unknown = await savePreferences(
      request("/api/preferences", { token: preferences, excludedSections: ["Not a section"] }),
    );
    expect(unknown.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("saves excluded sections and a suggestion for a valid preferences token", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const token = signToken(
      { email: "Reader@Hangar.Example", segment: "aviation", purpose: "preferences" },
      "preferences-test-secret",
    );
    const saved = await savePreferences(
      request("/api/preferences", { token, excludedSections: ["Warehousing"] }),
    );
    expect(saved.status).toBe(200);
    const prefCall = fetchMock.mock.calls[0];
    expect(String(prefCall?.[0])).toContain("/rest/v1/subscriber_prefs");
    expect(String(prefCall?.[1]?.headers?.authorization)).toBe("Bearer service-role-test");
    const prefBody = JSON.parse(String(prefCall?.[1]?.body)) as {
      email: string;
      excluded_sections: string[];
    };
    expect(prefBody.email).toBe("reader@hangar.example");
    expect(prefBody.excluded_sections).toEqual(["Warehousing"]);

    const suggested = await suggestTopic(
      request("/api/suggest", { token, text: "  Hangar robots  ", source: "LinkedIn" }),
    );
    expect(suggested.status).toBe(200);
    const suggestionCall = fetchMock.mock.calls[1];
    expect(String(suggestionCall?.[0])).toContain("/rest/v1/topic_suggestions");
    const suggestionBody = JSON.parse(String(suggestionCall?.[1]?.body)) as {
      email: string;
      text: string;
      source: string;
      status: string;
    };
    expect(suggestionBody).toMatchObject({
      email: "reader@hangar.example",
      text: "Hangar robots",
      source: "linkedin",
      status: "new",
    });
  });

  it("rate limits repeated saves and requires Supabase for a write", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const token = signToken(
      { email: "reader@hangar.example", segment: "aviation", purpose: "preferences" },
      "preferences-test-secret",
    );
    for (let index = 0; index < READER_WRITE_LIMIT; index += 1) {
      const response = await savePreferences(request("/api/preferences", { token, excludedSections: [] }));
      expect(response.status).toBe(200);
    }
    const blocked = await savePreferences(request("/api/preferences", { token, excludedSections: [] }));
    expect(blocked.status).toBe(429);

    resetRateLimits();
    delete process.env.SUPABASE_URL;
    const unconfigured = await suggestTopic(request("/api/suggest", { token, text: "A new topic" }));
    expect(unconfigured.status).toBe(503);
  });

  it("keeps signup choices off the database until confirm", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
    process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
    fetchMock.mockResolvedValue(new Response(null, { status: 201 }));
    const token = signToken(
      {
        email: "reader@hangar.example",
        segment: "aviation",
        purpose: "confirm",
        pending: { excluded: ["Warehousing"], suggestion: "Hangar robots", source: "linkedin" },
      },
      "preferences-test-secret",
    );
    expect(fetchMock).not.toHaveBeenCalled();
    const confirmed = await confirmSubscription(token);
    expect(confirmed.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const prefBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body)) as {
      excluded_sections: string[];
      source: string;
    };
    expect(prefBody.excluded_sections).toEqual(["Warehousing"]);
    expect(prefBody.source).toBe("linkedin");
    const suggestionBody = JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body)) as {
      text: string;
      source: string;
    };
    expect(suggestionBody).toMatchObject({ text: "Hangar robots", source: "linkedin" });
  });
});
