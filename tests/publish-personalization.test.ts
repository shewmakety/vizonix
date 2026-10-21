import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { pingIndexNow } = vi.hoisted(() => ({
  pingIndexNow: vi.fn(async () => ({ ok: true })),
}));

const resend = vi.hoisted(() => ({
  send: vi.fn(async () => ({ data: { id: "email_1" }, error: null })),
  batchSend: vi.fn(async () => ({ data: { data: [{ id: "batch_1" }] }, error: null })),
  list: vi.fn(),
}));

vi.mock("@/lib/indexnow", () => ({
  pingIndexNow,
  indexNowTargets: () => ["https://vizonix.com/aviation/issues/2026-10-21"],
}));

vi.mock("@/lib/linkedin", () => ({
  postIssueToLinkedIn: vi.fn(async () => ({ ok: false, skipped: "disabled" })),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.send };
    batch = { send: resend.batchSend };
    contacts = { list: resend.list };
    broadcasts = { create: vi.fn() };
  },
}));

import { getIssue } from "@/lib/content";
import { publishIssue, sendIssue, PERSONAL_BATCH_LIMIT } from "@/lib/publish";
import type { Issue } from "@/lib/schema";

const envKeys = [
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "RESEND_SEGMENT_ID_AVIATION",
  "RESEND_TEST_TO",
  "TOKEN_SECRET",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "INDEXNOW_KEY",
] as const;
const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function issue(): Issue {
  const loaded = getIssue("aviation", "2026-10-21");
  if (!loaded) throw new Error("Missing the October 21 aviation issue.");
  return loaded;
}

function contact(id: string, email: string, unsubscribed = false) {
  return {
    id,
    email,
    unsubscribed,
    created_at: "2026-10-21T00:00:00.000Z",
    first_name: null,
    last_name: null,
  };
}

beforeEach(() => {
  pingIndexNow.mockClear();
  resend.send.mockClear();
  resend.batchSend.mockClear();
  resend.list.mockReset();
  for (const key of envKeys) previous[key] = process.env[key];
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
  process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
  process.env.TOKEN_SECRET = "personal-test-secret";
  delete process.env.RESEND_TEST_TO;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.INDEXNOW_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const key of envKeys) {
    const value = previous[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe("personalized issue send", () => {
  it("sends one rendered issue per exclusion group and targets each confirmed reader once", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json([
        { email: "skip-warehouse@hangar.example", excluded_sections: ["Warehousing"] },
        { email: "skip-warehouse-2@hangar.example", excluded_sections: ["Warehousing"] },
        { email: "skip-recruiting@hangar.example", excluded_sections: ["Recruiting"] },
        { email: "not-on-list@hangar.example", excluded_sections: ["Warehousing"] },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-test";
    resend.list.mockResolvedValue({
      data: {
        object: "list",
        has_more: false,
        data: [
          contact("c1", "full@hangar.example"),
          contact("c2", "skip-warehouse@hangar.example"),
          contact("c3", "Skip-Warehouse-2@hangar.example"),
          contact("c4", "skip-recruiting@hangar.example"),
          contact("c5", "pending@hangar.example", true),
        ],
      },
      error: null,
    });

    const logs: string[] = [];
    const spy = vi.spyOn(console, "log").mockImplementation((message) => {
      logs.push(String(message));
    });
    const delivery = await sendIssue(issue(), {});
    spy.mockRestore();

    expect(delivery.mode).toBe("broadcast");
    expect(delivery.recipients).toBe(4);
    expect(delivery.groups).toEqual([
      { excluded: [], count: 1 },
      { excluded: ["Warehousing"], count: 2 },
      { excluded: ["Recruiting"], count: 1 },
    ]);
    expect(resend.list).toHaveBeenCalledWith(expect.objectContaining({ segmentId: "seg_aviation" }));
    expect(resend.batchSend).toHaveBeenCalledTimes(3);
    const calls = (resend.batchSend.mock.calls as unknown as Array<[Array<{ to: string[]; html: string }>]>).map(
      (call) => call[0],
    );
    const targeted = calls.flatMap((batch) => batch.map((message) => message.to[0])).sort();
    expect(targeted).toEqual([
      "full@hangar.example",
      "skip-recruiting@hangar.example",
      "skip-warehouse-2@hangar.example",
      "skip-warehouse@hangar.example",
    ]);
    const warehouse = calls.find((batch) => batch[0]?.to[0]?.includes("warehouse"));
    expect(warehouse?.[0]?.html).not.toContain(">Warehousing</td>");
    expect(warehouse?.[0]?.html).toContain("Manage your topics");
    expect(warehouse?.[0]?.html).toContain("/preferences?token=");
    expect(warehouse?.[0]?.html).not.toContain("{{preferences_url}}");
    const full = calls.find((batch) => batch[0]?.to[0] === "full@hangar.example");
    expect(full?.[0]?.html).toContain(">Warehousing</td>");
    expect(logs.some((line) => line.includes("4 confirmed subscribers") && line.includes("3 groups"))).toBe(true);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("chunks a large group and keeps --test-to on one full copy", async () => {
    const readers = Array.from({ length: PERSONAL_BATCH_LIMIT + 1 }, (_, index) =>
      contact(`c${index}`, `reader${index}@hangar.example`),
    );
    resend.list.mockResolvedValue({
      data: { object: "list", has_more: false, data: readers },
      error: null,
    });
    const delivery = await sendIssue(issue(), {});
    expect(delivery.recipients).toBe(PERSONAL_BATCH_LIMIT + 1);
    expect(resend.batchSend).toHaveBeenCalledTimes(2);
    const sizes = (resend.batchSend.mock.calls as unknown as Array<[unknown[]]>).map((call) => call[0].length);
    expect(sizes).toEqual([PERSONAL_BATCH_LIMIT, 1]);

    resend.batchSend.mockClear();
    resend.list.mockClear();
    const test = await sendIssue(issue(), { testTo: "editor@vizonix.com" });
    expect(test).toMatchObject({ mode: "test", recipients: 1 });
    expect(resend.list).not.toHaveBeenCalled();
    expect(resend.batchSend).not.toHaveBeenCalled();
    expect(resend.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["editor@vizonix.com"],
        html: expect.stringContaining(">Warehousing</td>"),
      }),
    );
  });

  it("skips the IndexNow ping when the issue file is not written", async () => {
    const payload = issue();
    const draft = await publishIssue(payload, { send: false, write: false });
    expect(draft.indexNow).toEqual({ ok: false, skipped: "no-write" });
    const testSend = await publishIssue(payload, { send: true, write: false, testTo: "editor@vizonix.com" });
    expect(testSend.indexNow).toEqual({ ok: false, skipped: "no-write" });
    expect(testSend.delivery).toMatchObject({ mode: "test" });
    expect(pingIndexNow).not.toHaveBeenCalled();
  });
});
