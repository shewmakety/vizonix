import fs from "fs";
import path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { postIssueToLinkedIn } = vi.hoisted(() => ({
  postIssueToLinkedIn: vi.fn(async () => ({ ok: true, postId: "post_1" })),
}));

vi.mock("@/lib/linkedin", () => ({ postIssueToLinkedIn }));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: vi.fn(async () => ({ data: { id: "email_1" }, error: null })) };
    broadcasts = { create: vi.fn(async () => ({ data: { id: "bcast_1" }, error: null })) };
  },
}));

import { publishIssue } from "@/lib/publish";

const envKeys = ["RESEND_API_KEY", "EMAIL_FROM", "RESEND_SEGMENT_ID_AVIATION", "RESEND_TEST_TO", "INDEXNOW_KEY"] as const;
const saved: Record<string, string | undefined> = {};

function aviationIssue(): unknown {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "content/aviation/issues/2026-10-16.json"), "utf8"));
}

beforeEach(() => {
  for (const key of envKeys) saved[key] = process.env[key];
});

afterEach(() => {
  postIssueToLinkedIn.mockClear();
  postIssueToLinkedIn.mockResolvedValue({ ok: true, postId: "post_1" });
  for (const key of envKeys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("publish LinkedIn wiring", () => {
  it("posts only after a real broadcast", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
    process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
    delete process.env.RESEND_TEST_TO;
    delete process.env.INDEXNOW_KEY;
    const payload = aviationIssue();

    const draft = await publishIssue(payload, { send: false, write: false });
    expect(draft.linkedin).toMatchObject({ ok: false, skipped: "not a broadcast" });
    expect(postIssueToLinkedIn).not.toHaveBeenCalled();

    const testSend = await publishIssue(payload, { send: true, write: false, testTo: "reader@example.com" });
    expect(testSend.delivery).toMatchObject({ mode: "test" });
    expect(testSend.linkedin).toMatchObject({ ok: false, skipped: "not a broadcast" });
    expect(postIssueToLinkedIn).not.toHaveBeenCalled();

    const optedOut = await publishIssue(payload, { send: true, write: false, linkedin: false });
    expect(optedOut.delivery).toMatchObject({ mode: "broadcast" });
    expect(optedOut.linkedin).toMatchObject({ ok: false, skipped: "disabled" });
    expect(postIssueToLinkedIn).not.toHaveBeenCalled();

    const broadcast = await publishIssue(payload, { send: true, write: false });
    expect(broadcast.delivery).toMatchObject({ mode: "broadcast" });
    expect(broadcast.linkedin).toEqual({ ok: true, postId: "post_1" });
    expect(postIssueToLinkedIn).toHaveBeenCalledOnce();

    postIssueToLinkedIn.mockRejectedValueOnce(new Error("Unipile down"));
    const failed = await publishIssue(payload, { send: true, write: false });
    expect(failed.delivery).toMatchObject({ mode: "broadcast" });
    expect(failed.linkedin).toMatchObject({ ok: false, error: "Unipile down" });
  });
});
