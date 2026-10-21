import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signToken, verifyToken } from "@/lib/tokens";

const resend = vi.hoisted(() => ({
  send: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.send };
    broadcasts = { create: resend.create };
    contacts = {
      update: resend.update,
      segments: { remove: resend.remove },
    };
  },
}));

import { POST } from "@/app/api/unsubscribe/route";
import UnsubscribePage from "@/app/unsubscribe/page";
import { getIssue } from "@/lib/content";
import { sendIssue } from "@/lib/publish";
import type { Issue } from "@/lib/schema";

const envKeys = [
  "TOKEN_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "RESEND_SEGMENT_ID_AVIATION",
  "RESEND_TEST_TO",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function issue(): Issue {
  const loaded = getIssue("aviation", "2026-10-21");
  if (!loaded) throw new Error("Missing the October 21 aviation issue.");
  return loaded;
}

function footerHref(html: string): string {
  const match = html.match(/<a href="([^"]+)"[^>]*>Unsubscribe<\/a>/);
  if (!match?.[1]) throw new Error("Missing the footer unsubscribe link.");
  return match[1].replaceAll("&amp;", "&");
}

describe("unsubscribe", () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = "unsubscribe-test-secret";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
    process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
    process.env.NEXT_PUBLIC_SITE_URL = "https://vizonix.com";
    delete process.env.RESEND_TEST_TO;
    resend.send.mockReset();
    resend.create.mockReset();
    resend.update.mockReset();
    resend.remove.mockReset();
    resend.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    resend.create.mockResolvedValue({ data: { id: "bcast_1" }, error: null });
    resend.update.mockResolvedValue({ data: { id: "contact" }, error: null });
    resend.remove.mockResolvedValue({ data: { id: "membership", deleted: true }, error: null });
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = previousEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("follows the briefing footer link through to Resend and accepts the one-click header", async () => {
    await sendIssue(issue(), { testTo: "Reader@Example.com" });
    expect(resend.send).toHaveBeenCalledTimes(1);
    const payload = resend.send.mock.calls[0][0] as {
      html: string;
      text: string;
      headers: Record<string, string>;
    };
    const href = footerHref(payload.html);
    const pageUrl = new URL(href);
    expect(pageUrl.origin).toBe("https://vizonix.com");
    expect(pageUrl.pathname).toBe("/aviation/unsubscribe");
    const token = pageUrl.searchParams.get("token");
    expect(token).toBeTruthy();
    expect(verifyToken(token ?? "", "unsubscribe-test-secret", "unsubscribe")?.email).toBe("reader@example.com");
    expect(payload.text).toContain(href);
    expect(payload.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    const headerUrl = payload.headers["List-Unsubscribe"].replace(/^<|>$/g, "");
    expect(new URL(headerUrl).pathname).toBe("/api/unsubscribe");
    expect(new URL(headerUrl).searchParams.get("token")).toBe(token);

    const page = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({ token: token ?? "" }) }));
    expect(page).toContain("reader@example.com");
    expect(page).toContain(">Unsubscribe</button>");
    expect(page).not.toContain("Email me an unsubscribe link");
    expect(page).not.toContain('type="email"');

    const clicked = await POST(
      new Request("https://vizonix.com/api/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token }),
      }),
    );
    expect(clicked.status).toBe(200);
    const body = (await clicked.json()) as { message?: string };
    expect(body.message).toContain("reader@example.com");
    expect(body.message).toContain("Aviation");
    expect(resend.remove).toHaveBeenCalledWith({ email: "reader@example.com", segmentId: "seg_aviation" });
    expect(resend.update).toHaveBeenCalledWith({ email: "reader@example.com", unsubscribed: true });

    const oneClick = await POST(
      new Request(headerUrl, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ "List-Unsubscribe": "One-Click" }),
      }),
    );
    expect(oneClick.status).toBe(202);
    expect(resend.update).toHaveBeenCalledTimes(2);
  });

  it("keeps the Resend placeholder in a broadcast footer", async () => {
    await sendIssue(issue(), {});
    expect(resend.send).not.toHaveBeenCalled();
    const payload = resend.create.mock.calls[0][0] as { html: string; text: string; headers?: unknown };
    expect(footerHref(payload.html)).toBe("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(payload.text).toContain("Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(payload.headers).toBeUndefined();
  });

  it("does not email an unsubscribe link when someone types an address", async () => {
    const response = await POST(
      new Request("https://vizonix.com/api/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: "stranger@example.com", segment: "aviation" }),
      }),
    );
    expect(response.status).toBe(400);
    expect(resend.send).not.toHaveBeenCalled();
    expect(resend.update).not.toHaveBeenCalled();
  });

  it("shows the briefing-email instruction when the page has no valid token", async () => {
    const empty = renderToStaticMarkup(await UnsubscribePage({ searchParams: Promise.resolve({}) }));
    expect(empty).toContain("Use the unsubscribe link at the bottom of any briefing email.");
    expect(empty).not.toContain("Email me an unsubscribe link");
    expect(empty).not.toContain('type="email"');

    const expired = signToken(
      { email: "reader@example.com", segment: "aviation", purpose: "unsubscribe" },
      "unsubscribe-test-secret",
      Date.now() - 1000 * 60 * 60 * 24 * 181,
    );
    const invalid = renderToStaticMarkup(
      await UnsubscribePage({ searchParams: Promise.resolve({ token: expired }) }),
    );
    expect(invalid).toContain("This unsubscribe link is invalid or expired.");
    expect(invalid).toContain("Use the unsubscribe link at the bottom of any briefing email.");
    expect(invalid).not.toContain(">Unsubscribe</button>");
  });
});
