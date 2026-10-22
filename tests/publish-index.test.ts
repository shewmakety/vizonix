import { generateKeyPairSync } from "crypto";
import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const writeIssueFile = vi.hoisted(() => vi.fn(() => "content/aviation/issues/2026-10-22.json"));

vi.mock("@/lib/content", async () => {
  const actual = await vi.importActual<typeof import("@/lib/content")>("@/lib/content");
  return { ...actual, writeIssueFile };
});

vi.mock("@/lib/linkedin", () => ({
  postIssueToLinkedIn: vi.fn(async () => ({ ok: true, postId: "post_1" })),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn(async () => ({ data: { id: "email_1" }, error: null })) };
    contacts = { list: vi.fn() };
    batch = { send: vi.fn() };
    broadcasts = { create: vi.fn() };
  },
}));

import { getIssue } from "@/lib/content";
import { INDEXNOW_PUBLIC_KEY, indexNowTargets, pingIndexNow } from "@/lib/indexnow";
import { publishIssue } from "@/lib/publish";
import {
  DEFAULT_GSC_SITEMAP_URL,
  DEFAULT_GSC_SITE_URL,
  submitSearchConsoleSitemap,
  webmastersSitemapSubmitUrl,
} from "@/lib/search-console";
import type { Issue } from "@/lib/schema";

const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const SERVICE_ACCOUNT = JSON.stringify({
  client_email: "search@vizonix.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
});

const envKeys = [
  "INDEXNOW_KEY",
  "GSC_SERVICE_ACCOUNT_JSON",
  "GSC_SITE_URL",
  "GSC_SITEMAP_URL",
  "NEXT_PUBLIC_SITE_URL",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "RESEND_SEGMENT_ID_AVIATION",
  "RESEND_TEST_TO",
  "TOKEN_SECRET",
  "VERCEL",
] as const;
const saved: Record<string, string | undefined> = {};

function aviationIssue(): Issue {
  const loaded = getIssue("aviation", "2026-10-22");
  if (!loaded) throw new Error("Missing the October 22 aviation issue.");
  return loaded;
}

beforeEach(() => {
  writeIssueFile.mockClear();
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.NEXT_PUBLIC_SITE_URL = "https://vizonix.com";
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
  process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
  delete process.env.INDEXNOW_KEY;
  delete process.env.GSC_SERVICE_ACCOUNT_JSON;
  delete process.env.GSC_SITE_URL;
  delete process.env.GSC_SITEMAP_URL;
  delete process.env.RESEND_TEST_TO;
  delete process.env.VERCEL;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("IndexNow publish ping", () => {
  it("posts the issue, the segment page, the toolbox, and the sitemap with the committed key", async () => {
    const urls = indexNowTargets({ segment: "aviation", date: "2026-10-22" });
    expect(urls).toEqual([
      "https://vizonix.com/aviation/issues/2026-10-22",
      "https://vizonix.com/aviation",
      "https://vizonix.com/aviation/toolbox",
      "https://vizonix.com/sitemap.xml",
    ]);

    let posted: unknown;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => {
        posted = JSON.parse(String(init?.body));
        return new Response(null, { status: 202 });
      }),
    );

    await expect(pingIndexNow(urls)).resolves.toEqual({ ok: true });
    expect(posted).toEqual({
      host: "vizonix.com",
      key: INDEXNOW_PUBLIC_KEY,
      keyLocation: `https://vizonix.com/${INDEXNOW_PUBLIC_KEY}.txt`,
      urlList: urls,
    });
  });

  it("returns a failure for a non-OK response and a network error without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 422 })));
    await expect(pingIndexNow(["https://vizonix.com/sitemap.xml"])).resolves.toEqual({
      ok: false,
      error: "IndexNow responded 422",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("socket hang up");
      }),
    );
    await expect(pingIndexNow(["https://vizonix.com/sitemap.xml"])).resolves.toEqual({
      ok: false,
      error: "socket hang up",
    });
  });
});

describe("Search Console sitemap submit", () => {
  it("skips when the service account is unset", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(submitSearchConsoleSitemap()).resolves.toEqual({
      ok: false,
      skipped: "GSC_SERVICE_ACCOUNT_JSON is not set",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("submits https://www.vizonix.com/sitemap.xml with a service-account token", async () => {
    process.env.GSC_SERVICE_ACCOUNT_JSON = SERVICE_ACCOUNT;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url) !== "https://oauth2.googleapis.com/token") return new Response(null, { status: 204 });
      const params = new URLSearchParams(String(init?.body));
      const assertion = params.get("assertion") ?? "";
      const payload = JSON.parse(Buffer.from(assertion.split(".")[1] ?? "", "base64url").toString("utf8")) as {
        iss?: string;
        scope?: string;
        aud?: string;
      };
      expect(payload).toMatchObject({
        iss: "search@vizonix.iam.gserviceaccount.com",
        scope: "https://www.googleapis.com/auth/webmasters",
        aud: "https://oauth2.googleapis.com/token",
      });
      return Response.json({ access_token: "ya29.test" });
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(submitSearchConsoleSitemap()).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const submit = fetchMock.mock.calls[1] as unknown as [string, { method?: string; headers?: { authorization?: string } }];
    expect(submit[0]).toBe(webmastersSitemapSubmitUrl(DEFAULT_GSC_SITE_URL, DEFAULT_GSC_SITEMAP_URL));
    expect(submit[0]).toContain(encodeURIComponent("https://www.vizonix.com/sitemap.xml"));
    expect(submit[1]).toMatchObject({ method: "PUT", headers: { authorization: "Bearer ya29.test" } });
  });

  it("reads the service account from a file path and honors site overrides", async () => {
    const file = path.join(os.tmpdir(), `gsc-publish-index-${process.pid}.json`);
    fs.writeFileSync(file, SERVICE_ACCOUNT);
    process.env.GSC_SERVICE_ACCOUNT_JSON = file;
    process.env.GSC_SITE_URL = "sc-domain:vizonix.com";
    process.env.GSC_SITEMAP_URL = "https://www.vizonix.com/sitemap.xml";
    const fetchMock = vi.fn(async (url: string) => {
      if (String(url) === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "ya29.file" });
      return new Response(null, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      await expect(submitSearchConsoleSitemap()).resolves.toEqual({ ok: true });
      expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
        webmastersSitemapSubmitUrl("sc-domain:vizonix.com", "https://www.vizonix.com/sitemap.xml"),
      );
    } finally {
      fs.unlinkSync(file);
    }
  });

  it("returns an error for bad credentials or a rejected submit and does not throw", async () => {
    process.env.GSC_SERVICE_ACCOUNT_JSON = "{not json";
    await expect(submitSearchConsoleSitemap()).resolves.toEqual({
      ok: false,
      error: "GSC_SERVICE_ACCOUNT_JSON is not valid JSON",
    });

    process.env.GSC_SERVICE_ACCOUNT_JSON = SERVICE_ACCOUNT;
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 401 })));
    await expect(submitSearchConsoleSitemap()).resolves.toEqual({
      ok: false,
      error: "Google token request failed (401).",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url) === "https://oauth2.googleapis.com/token") return Response.json({ access_token: "ya29.test" });
        return new Response("forbidden", { status: 403 });
      }),
    );
    await expect(submitSearchConsoleSitemap()).resolves.toEqual({
      ok: false,
      error: "Search Console responded 403",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    await expect(submitSearchConsoleSitemap()).resolves.toEqual({ ok: false, error: "network down" });
  });
});

describe("publish indexing", () => {
  it("logs a skipped Google submit and does not ping when the issue was not published", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi.fn(async () => {
      throw new Error("indexing should not run");
    });
    vi.stubGlobal("fetch", fetchMock);

    const unpublished = await publishIssue(aviationIssue(), { send: false, write: false, linkedin: false });
    expect(unpublished.indexNow).toMatchObject({ ok: false, skipped: "not published" });
    expect(unpublished.searchConsole).toMatchObject({ ok: false, skipped: "not published" });

    const sample = await publishIssue({ ...aviationIssue(), sample: true }, { send: false, write: true, linkedin: false });
    expect(sample.written).toBe("local");
    expect(sample.indexNow).toMatchObject({ ok: false, skipped: "sample" });
    expect(sample.searchConsole).toMatchObject({ ok: false, skipped: "sample" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled();
  });

  it("keeps the email result when IndexNow and Search Console fail", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );

    const written = await publishIssue(aviationIssue(), { send: false, write: true, linkedin: false });
    expect(written.written).toBe("local");
    expect(written.indexNow).toMatchObject({ ok: false, error: "network down" });
    expect(written.searchConsole).toMatchObject({
      ok: false,
      skipped: "GSC_SERVICE_ACCOUNT_JSON is not set",
    });
    expect(warn.mock.calls.map((call) => String(call[0])).join("\n")).toContain(
      "Search Console skipped: GSC_SERVICE_ACCOUNT_JSON is not set",
    );
    expect(writeIssueFile).toHaveBeenCalled();

    process.env.GSC_SERVICE_ACCOUNT_JSON = SERVICE_ACCOUNT;
    const sent = await publishIssue(aviationIssue(), {
      send: true,
      write: true,
      testTo: "reader@example.com",
      linkedin: false,
    });
    expect(sent.delivery).toMatchObject({ mode: "test", id: "email_1" });
    expect(sent.indexNow).toMatchObject({ ok: false, error: "network down" });
    expect(sent.searchConsole).toMatchObject({ ok: false, error: "network down" });
    expect(warn.mock.calls.map((call) => String(call[0])).join("\n")).toContain(
      "Search Console sitemap submit failed: network down",
    );
  });
});
