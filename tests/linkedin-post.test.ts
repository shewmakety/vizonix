import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseIssue, type Issue } from "@/lib/schema";

const resend = vi.hoisted(() => ({ constructed: 0 }));
const content = vi.hoisted(() => ({
  getIssue: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    constructor() {
      resend.constructed += 1;
      throw new Error("email client was constructed");
    }
    emails = {
      send: () => {
        throw new Error("email was sent");
      },
    };
    broadcasts = {
      create: () => {
        throw new Error("broadcast was sent");
      },
    };
  },
}));

vi.mock("@/lib/content", () => ({
  getIssue: content.getIssue,
}));

import { POST } from "@/app/api/linkedin-post/route";

const envKeys = [
  "PUBLISH_SECRET",
  "LINKEDIN_AUTOPOST",
  "UNIPILE_DSN",
  "UNIPILE_API_KEY",
  "UNIPILE_ACCOUNT_ID",
  "LINKEDIN_ORG_ID_VIZONIX",
  "NEXT_PUBLIC_SITE_URL",
  "VERCEL",
  "GITHUB_TOKEN",
  "GITHUB_REPO",
] as const;

const saved: Record<string, string | undefined> = {};
const markerDates = ["2099-12-30", "2099-12-31"];

function aviation(): Issue {
  return parseIssue(
    JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-16.json"), "utf8")),
  );
}

function markerFile(date: string): string {
  return path.join(process.cwd(), "content", "aviation", "linkedin", `${date}.json`);
}

function call(body: unknown, authorization?: string): Promise<Response> {
  return POST(
    new Request("https://www.vizonix.com/api/linkedin-post", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(authorization ? { authorization } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

beforeEach(() => {
  for (const key of envKeys) saved[key] = process.env[key];
  resend.constructed = 0;
  content.getIssue.mockReset();
  content.getIssue.mockImplementation((segment: string, date: string) => {
    if (segment === "aviation" && date === "2026-10-16") return aviation();
    return undefined;
  });
  process.env.PUBLISH_SECRET = "publish-secret";
});

afterEach(() => {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
  vi.unstubAllGlobals();
  for (const date of markerDates) {
    const file = markerFile(date);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  }
  const dir = path.join(process.cwd(), "content", "aviation", "linkedin");
  if (fs.existsSync(dir) && fs.readdirSync(dir).length === 0) fs.rmdirSync(dir);
});

describe("POST /api/linkedin-post", () => {
  it("does not import the email publish path", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "app/api/linkedin-post/route.ts"), "utf8");
    expect(source).not.toMatch(/sendIssue/);
    expect(source).not.toMatch(/@\/lib\/publish/);
    expect(source).not.toMatch(/from ["']resend["']/);
  });

  it("requires the publish secret", async () => {
    delete process.env.PUBLISH_SECRET;
    const missing = await call({ segment: "aviation", date: "2026-10-16" }, "Bearer publish-secret");
    expect(missing.status).toBe(503);

    process.env.PUBLISH_SECRET = "publish-secret";
    const denied = await call({ segment: "aviation", date: "2026-10-16" }, "Bearer wrong");
    expect(denied.status).toBe(401);
    expect(content.getIssue).not.toHaveBeenCalled();
    expect(resend.constructed).toBe(0);
  });

  it("refuses a sample issue and a missing file without posting", async () => {
    const fetchMock = vi.fn(() => {
      throw new Error("network was called");
    });
    vi.stubGlobal("fetch", fetchMock);

    content.getIssue.mockReturnValue({ ...aviation(), sample: true });
    const sample = await call({ segment: "aviation", date: "2026-10-16" }, "Bearer publish-secret");
    expect(sample.status).toBe(400);
    expect(await sample.json()).toEqual({ error: "Refusing to post a sample issue." });

    content.getIssue.mockReturnValue(undefined);
    const missing = await call({ segment: "aviation", date: "2099-11-11" }, "Bearer publish-secret");
    expect(missing.status).toBe(404);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(resend.constructed).toBe(0);
  });

  it("skips a duplicate marker and does not send email", async () => {
    process.env.LINKEDIN_AUTOPOST = "true";
    process.env.UNIPILE_DSN = "https://unipile.test";
    process.env.UNIPILE_API_KEY = "super-secret-unipile-key";
    delete process.env.VERCEL;
    const fetchMock = vi.fn(() => {
      throw new Error("network was called");
    });
    vi.stubGlobal("fetch", fetchMock);

    const date = "2099-12-31";
    fs.mkdirSync(path.dirname(markerFile(date)), { recursive: true });
    fs.writeFileSync(markerFile(date), JSON.stringify({ postId: "already", postedAt: "2026-10-16T00:00:00.000Z" }));
    content.getIssue.mockReturnValue({ ...aviation(), date });

    const response = await call({ segment: "aviation", date }, "Bearer publish-secret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ skipped: "already posted" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(resend.constructed).toBe(0);
  });

  it("posts the saved issue and returns the post id", async () => {
    process.env.LINKEDIN_AUTOPOST = "true";
    process.env.UNIPILE_DSN = "https://unipile.test";
    process.env.UNIPILE_API_KEY = "super-secret-unipile-key";
    process.env.UNIPILE_ACCOUNT_ID = "acc_1";
    process.env.LINKEDIN_ORG_ID_VIZONIX = "org_vz";
    process.env.NEXT_PUBLIC_SITE_URL = "https://www.vizonix.com";
    delete process.env.VERCEL;

    const date = "2099-12-30";
    content.getIssue.mockReturnValue({ ...aviation(), date });
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.startsWith("https://www.vizonix.com")) return new Response("ok", { status: 200 });
      if (url.includes("/api/v1/linkedin/company/")) {
        return Response.json({ viewer_permissions: { canCreateOrganicShare: true } });
      }
      if (url.endsWith("/api/v1/posts")) {
        const form = init?.body as FormData;
        const text = String(form.get("text"));
        expect(text).toContain("Read the full issue: https://www.vizonix.com/aviation/issues/2099-12-30");
        expect(text).toContain("Free AI briefing for aviation. Subscribe: https://www.vizonix.com/aviation");
        expect(text).not.toContain("...");
        return Response.json({ post_id: "post_route" }, { status: 201 });
      }
      return new Response("no", { status: 404 });
    });

    const response = await call({ segment: "aviation", date }, "Bearer publish-secret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ postId: "post_route" });
    expect(resend.constructed).toBe(0);
    const marker = JSON.parse(fs.readFileSync(markerFile(date), "utf8")) as { postId: string };
    expect(marker.postId).toBe("post_route");
  });
});
