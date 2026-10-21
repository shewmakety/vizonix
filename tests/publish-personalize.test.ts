import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getIssue } from "@/lib/content";
import type { Issue } from "@/lib/schema";

const send = vi.hoisted(() => vi.fn(async () => ({ data: { id: "email_1" }, error: null })));
const batchSend = vi.hoisted(() => vi.fn(async () => ({ data: { data: [{ id: "batch_1" }] }, error: null })));
const list = vi.hoisted(() => vi.fn());

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    contacts = { list };
    batch = { send: batchSend };
    broadcasts = { create: vi.fn() };
  },
}));

import { publishIssue, sendIssue } from "@/lib/publish";

const envKeys = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "RESEND_SEGMENT_ID_AVIATION",
  "RESEND_TEST_TO",
  "TOKEN_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "INDEXNOW_KEY",
  "NEXT_PUBLIC_SITE_URL",
] as const;
const saved: Record<string, string | undefined> = {};

function issue(): Issue {
  const loaded = getIssue("aviation", "2026-10-20");
  if (!loaded) throw new Error("Missing the October 20 aviation issue.");
  return loaded;
}

beforeEach(() => {
  send.mockClear();
  batchSend.mockClear();
  list.mockReset();
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
  process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
  process.env.TOKEN_SECRET = "personalize-secret";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
  process.env.NEXT_PUBLIC_SITE_URL = "https://vizonix.com";
  delete process.env.RESEND_TEST_TO;
  delete process.env.INDEXNOW_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("personalized issue send", () => {
  it("sends one batch per exclusion set and targets each confirmed reader once", async () => {
    list
      .mockResolvedValueOnce({
        data: {
          object: "list",
          has_more: true,
          data: [
            { id: "c1", email: "a@example.com", unsubscribed: false },
            { id: "c2", email: "d@example.com", unsubscribed: true },
          ],
        },
        error: null,
      })
      .mockResolvedValueOnce({
        data: {
          object: "list",
          has_more: false,
          data: [
            { id: "c3", email: "b@example.com", unsubscribed: false },
            { id: "c4", email: "c@example.com", unsubscribed: false },
            { id: "c5", email: "a@example.com", unsubscribed: false },
          ],
        },
        error: null,
      });
    const fetchMock = vi.fn(async (url: string) => {
      expect(String(url)).toContain("/rest/v1/subscriber_prefs");
      return Response.json([
        { email: "a@example.com", excluded_sections: ["Warehousing", "Recruiting"] },
        { email: "b@example.com", excluded_sections: ["Recruiting", "Warehousing"] },
      ]);
    });
    vi.stubGlobal("fetch", fetchMock);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});

    const result = await sendIssue(issue(), {});
    expect(result).toMatchObject({ mode: "broadcast", recipients: 3, groups: 2 });
    expect(list).toHaveBeenCalledTimes(2);
    expect(batchSend).toHaveBeenCalledTimes(2);
    expect(send).not.toHaveBeenCalled();

    const deliveries = batchSend.mock.calls.map((call) => {
      const [messages, options] = call as unknown as [
        Array<{ to: string[]; html: string; subject: string; headers: Record<string, string> }>,
        { idempotencyKey: string },
      ];
      return { messages, options };
    });
    const recipients = deliveries.flatMap((delivery) => delivery.messages.map((message) => message.to[0])).sort();
    expect(recipients).toEqual(["a@example.com", "b@example.com", "c@example.com"]);
    expect(new Set(deliveries.map((delivery) => delivery.options.idempotencyKey)).size).toBe(2);

    const trimmed = deliveries.find((delivery) => delivery.messages.some((message) => message.to[0] === "a@example.com"));
    const full = deliveries.find((delivery) => delivery.messages.some((message) => message.to[0] === "c@example.com"));
    expect(trimmed?.messages.map((message) => message.to[0]).sort()).toEqual(["a@example.com", "b@example.com"]);
    expect(trimmed?.messages[0]?.html).not.toContain(">Recruiting</td>");
    expect(trimmed?.messages[0]?.html).not.toContain(">Warehousing</td>");
    expect(full?.messages.map((message) => message.to[0])).toEqual(["c@example.com"]);
    expect(full?.messages[0]?.html).toContain(">Recruiting</td>");
    expect(full?.messages[0]?.html).toContain(">Warehousing</td>");
    for (const message of deliveries.flatMap((delivery) => delivery.messages)) {
      expect(message.html).toContain("The Ramp");
      expect(message.html).toContain("Top story");
      expect(message.html).toContain("Primary sponsor");
      expect(message.html).toContain("Manage your topics");
      expect(message.html).toContain("/preferences?token=");
      expect(message.html).not.toContain("__VZ_");
      expect(message.html).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
      expect(message.html).toContain("/aviation/unsubscribe?token=");
      expect(message.headers["List-Unsubscribe"]).toContain("/api/unsubscribe?token=");
      expect(message.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
      expect(message.subject.startsWith("The VIZONIX Daily:")).toBe(true);
    }
    expect(log.mock.calls.map((call) => call.join(" ")).join("\n")).toContain("3 confirmed subscribers, 2 groups");
  });

  it("keeps a test send as one full copy and skips IndexNow when the file is not written", async () => {
    const fetchMock = vi.fn(async () => {
      throw new Error("IndexNow should not be called");
    });
    vi.stubGlobal("fetch", fetchMock);
    process.env.INDEXNOW_KEY = "37974ccaf24526ab8e10a675a3fa4935";

    const testSend = await sendIssue(issue(), { testTo: "reader@example.com" });
    expect(testSend.mode).toBe("test");
    expect(send).toHaveBeenCalledTimes(1);
    expect(list).not.toHaveBeenCalled();
    expect(batchSend).not.toHaveBeenCalled();
    const payload = (send.mock.calls[0] as unknown as [{ html: string; to: string[] }])[0];
    expect(payload.to).toEqual(["reader@example.com"]);
    expect(payload.html).toContain(">Recruiting</td>");

    const unpublished = await publishIssue(issue(), { send: false, write: false });
    expect(unpublished.indexNow).toMatchObject({ ok: false, skipped: "not published" });
    const sentWithoutWrite = await publishIssue(issue(), {
      send: true,
      write: false,
      testTo: "reader@example.com",
    });
    expect(sentWithoutWrite.indexNow).toMatchObject({ ok: false, skipped: "not published" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not email anyone when saved topics cannot be read", async () => {
    list.mockResolvedValue({
      data: {
        object: "list",
        has_more: false,
        data: [{ id: "c1", email: "a@example.com", unsubscribed: false }],
      },
      error: null,
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(sendIssue(issue(), {})).rejects.toThrow(/reach the reader list/);
    expect(batchSend).not.toHaveBeenCalled();
  });
});
