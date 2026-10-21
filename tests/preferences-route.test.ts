import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "@/lib/tokens";
import { resetRateLimits } from "@/lib/rate-limit";

const envKeys = ["TOKEN_SECRET", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const saved: Record<string, string | undefined> = {};

function token(purpose: "preferences" | "confirm" = "preferences"): string {
  return signToken({ email: "reader@example.com", segment: "aviation", purpose }, "route-secret");
}

function request(path: string, body: unknown): Request {
  return new Request(`https://vizonix.com${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.8, 10.0.0.1" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

beforeEach(() => {
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.TOKEN_SECRET = "route-secret";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  resetRateLimits();
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("preference routes", () => {
  it("rejects a bad token and an unknown topic", async () => {
    const { POST } = await import("@/app/api/preferences/route");
    expect((await POST(request("/api/preferences", "not-json"))).status).toBe(400);
    expect((await POST(request("/api/preferences", {}))).status).toBe(400);
    const forged = await POST(request("/api/preferences", { token: token("confirm"), excludedSections: [] }));
    expect(forged.status).toBe(400);
    const unknown = await POST(
      request("/api/preferences", { token: token(), excludedSections: ["Not a topic"] }),
    );
    expect(unknown.status).toBe(400);
  });

  it("saves excluded topics for a signed reader and rate limits the next calls", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/preferences/route");
    const response = await POST(
      request("/api/preferences", { token: token(), excludedSections: ["Warehousing", "Recruiting"] }),
    );
    expect(response.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("https://example.supabase.co/rest/v1/subscriber_prefs");
    expect(init.method).toBe("POST");
    const headers = init.headers as Headers;
    expect(headers.get("apikey")).toBe("service-role-test");
    const stored = JSON.parse(String(init.body)) as { email: string; excluded_sections: string[]; segment: string };
    expect(stored.email).toBe("reader@example.com");
    expect(stored.segment).toBe("aviation");
    expect(stored.excluded_sections).toEqual(["Recruiting", "Warehousing"]);

    for (let attempt = 0; attempt < 9; attempt += 1) {
      expect((await POST(request("/api/preferences", { token: "bad", excludedSections: [] }))).status).toBe(400);
    }
    expect((await POST(request("/api/preferences", { token: token(), excludedSections: [] }))).status).toBe(429);
  });

  it("stores a suggestion from the preferences token", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    const { POST } = await import("@/app/api/suggest/route");
    const missing = await POST(request("/api/suggest", { token: token(), text: "   " }));
    expect(missing.status).toBe(400);
    const response = await POST(
      request("/api/suggest", { token: token(), text: "  Hangar robots  ", source: "LinkedIn!" }),
    );
    expect(response.status).toBe(200);
    const stored = JSON.parse(String((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body)) as {
      email: string;
      text: string;
      source: string;
      status: string;
    };
    expect(stored).toMatchObject({
      email: "reader@example.com",
      text: "Hangar robots",
      source: "linkedin",
      status: "new",
    });
    expect((await POST(request("/api/suggest", { token: token("confirm"), text: "Hangar robots" }))).status).toBe(400);
  });
});
