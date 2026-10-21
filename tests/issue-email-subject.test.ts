import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn(async () => ({ data: { id: "email_1" }, error: null })));
const create = vi.hoisted(() => vi.fn(async () => ({ data: { id: "bcast_1" }, error: null })));
const batchSend = vi.hoisted(() => vi.fn(async () => ({ data: { data: [{ id: "batch_1" }] }, error: null })));
const listContacts = vi.hoisted(() =>
  vi.fn(async () => ({
    data: {
      object: "list",
      has_more: false,
      data: [
        {
          id: "contact_1",
          email: "reader@example.com",
          unsubscribed: false,
          created_at: "2026-10-20T00:00:00.000Z",
          first_name: null,
          last_name: null,
        },
      ],
    },
    error: null,
  })),
);

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    broadcasts = { create };
    batch = { send: batchSend };
    contacts = { list: listContacts };
  },
}));

import { getIssue } from "@/lib/content";
import { formatShortDate } from "@/lib/dates";
import { buildLinkedInPost } from "@/lib/linkedin";
import { ISSUE_EMAIL_SUBJECT_PREFIX, issueEmailSubject, sendIssue } from "@/lib/publish";
import type { Issue } from "@/lib/schema";

const envKeys = ["RESEND_API_KEY", "EMAIL_FROM", "RESEND_SEGMENT_ID_AVIATION", "RESEND_TEST_TO", "TOKEN_SECRET"] as const;
const saved: Record<string, string | undefined> = {};

function issue(): Issue {
  const loaded = getIssue("aviation", "2026-10-20");
  if (!loaded) throw new Error("Missing the October 20 aviation issue.");
  return loaded;
}

beforeEach(() => {
  send.mockClear();
  create.mockClear();
  batchSend.mockClear();
  listContacts.mockClear();
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
  process.env.TOKEN_SECRET = "subject-test-secret";
  delete process.env.RESEND_SEGMENT_ID_AVIATION;
  delete process.env.RESEND_TEST_TO;
});

afterEach(() => {
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("issue email subject", () => {
  it("prefixes the stored subject once for test sends and broadcasts", async () => {
    const stored = issue().subject;
    const subject = `${ISSUE_EMAIL_SUBJECT_PREFIX}${formatShortDate(issue().date)} - ${stored}`;
    expect(formatShortDate("2026-10-20")).toBe("Oct 20, 2026");
    expect(formatShortDate("2026-10-01")).toBe("Oct 1, 2026");
    expect(subject).toBe(
      "The VIZONIX Daily: Oct 20, 2026 - When should a predictive alert ground an aircraft? Plus 7 places to put AI and robotics to work",
    );
    expect(issueEmailSubject(stored, issue().date)).toBe(subject);
    expect(issueEmailSubject(subject, issue().date)).toBe(subject);
    expect(issueEmailSubject(`${ISSUE_EMAIL_SUBJECT_PREFIX}${stored}`, issue().date)).toBe(
      `${ISSUE_EMAIL_SUBJECT_PREFIX}${stored}`,
    );

    await sendIssue(issue(), { testTo: "reader@example.com" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ subject }));

    process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
    await sendIssue(issue(), {});
    expect(batchSend).toHaveBeenCalled();
    const batch = (batchSend.mock.calls as unknown as Array<[Array<{ subject: string }>]>)[0]?.[0];
    expect(batch?.[0]?.subject).toBe(subject);
    expect(create).not.toHaveBeenCalled();

    await sendIssue({ ...issue(), subject }, { testTo: "reader@example.com" });
    expect(send).toHaveBeenLastCalledWith(expect.objectContaining({ subject }));
  });

  it("leaves the LinkedIn post on the stored subject", () => {
    const stored = issue();
    const post = buildLinkedInPost(stored, "https://www.vizonix.com/aviation/issues/2026-10-20");
    expect(post.startsWith(stored.subject)).toBe(true);
    expect(post).not.toContain(ISSUE_EMAIL_SUBJECT_PREFIX.trim());
  });
});
