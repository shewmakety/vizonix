import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn(async () => ({ data: { id: "email_1" }, error: null })));
const create = vi.hoisted(() => vi.fn(async () => ({ data: { id: "bcast_1" }, error: null })));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
    broadcasts = { create };
  },
}));

import { getIssue } from "@/lib/content";
import { buildLinkedInPost } from "@/lib/linkedin";
import { ISSUE_EMAIL_SUBJECT_PREFIX, issueEmailSubject, sendIssue } from "@/lib/publish";
import type { Issue } from "@/lib/schema";

const envKeys = ["RESEND_API_KEY", "EMAIL_FROM", "RESEND_SEGMENT_ID_AVIATION", "RESEND_TEST_TO"] as const;
const saved: Record<string, string | undefined> = {};

function issue(): Issue {
  const loaded = getIssue("aviation", "2026-10-20");
  if (!loaded) throw new Error("Missing the October 20 aviation issue.");
  return loaded;
}

beforeEach(() => {
  send.mockClear();
  create.mockClear();
  for (const key of envKeys) saved[key] = process.env[key];
  process.env.RESEND_API_KEY = "re_test";
  process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
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
    const subject = `${ISSUE_EMAIL_SUBJECT_PREFIX}${stored}`;
    expect(issueEmailSubject(stored)).toBe(subject);
    expect(issueEmailSubject(subject)).toBe(subject);

    await sendIssue(issue(), { testTo: "reader@example.com" });
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ subject }));

    process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
    await sendIssue(issue(), {});
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ subject }));

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
