import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "@/lib/tokens";

const resend = vi.hoisted(() => ({
  send: vi.fn(),
  get: vi.fn(),
  update: vi.fn(),
  add: vi.fn(),
}));

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send: resend.send };
      contacts = {
        get: resend.get,
        update: resend.update,
        segments: { add: resend.add },
      };
    },
  };
});

import { confirmSubscription, welcomeIdempotencyKey } from "@/lib/subscribe";

const envKeys = [
  "TOKEN_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "RESEND_SEGMENT_ID_AVIATION",
  "RESEND_SEGMENT_ID_LEGAL",
  "RESEND_SEGMENT_ID_WAREHOUSING",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function confirmToken(email: string, segment: string): string {
  return signToken({ email, segment, purpose: "confirm" }, "welcome-test-secret");
}

describe("welcome email on confirm", () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = "welcome-test-secret";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Vizonix <hello@vizonix.com>";
    process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
    process.env.RESEND_SEGMENT_ID_LEGAL = "seg_legal";
    process.env.RESEND_SEGMENT_ID_WAREHOUSING = "seg_warehousing";
    process.env.NEXT_PUBLIC_SITE_URL = "https://vizonix.com";
    resend.send.mockReset();
    resend.get.mockReset();
    resend.update.mockReset();
    resend.add.mockReset();
    resend.get.mockResolvedValue({ data: { unsubscribed: true }, error: null });
    resend.update.mockResolvedValue({ data: { id: "contact" }, error: null });
    resend.add.mockResolvedValue({ data: { id: "membership" }, error: null });
    resend.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = previousEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("sends the latest published issue on the first confirm", async () => {
    const result = await confirmSubscription(confirmToken("reader@example.com", "aviation"));
    expect(result.ok).toBe(true);
    expect(resend.send).toHaveBeenCalledTimes(1);
    const [payload, options] = resend.send.mock.calls[0] as [
      {
        from: string;
        to: string[];
        subject: string;
        html: string;
        text: string;
        headers: Record<string, string>;
      },
      { idempotencyKey: string },
    ];
    expect(payload.from).toBe("Vizonix <hello@vizonix.com>");
    expect(payload.to).toEqual(["reader@example.com"]);
    expect(payload.subject).toBe("Welcome to Vizonix - here's the latest Aviation issue");
    expect(payload.html).toContain("Thanks for confirming");
    expect(payload.html).toContain("short AI briefing every weekday morning for Aviation");
    expect(payload.html).toContain("hello@vizonix.com");
    expect(payload.html).toContain("Veryon puts an AI assistant inside the business aviation maintenance record");
    expect(payload.html).toContain("https://vizonix.com/aviation/issues/2026-10-16");
    expect(payload.html).toContain("/unsubscribe?token=");
    expect(payload.html).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(payload.text).toContain("Thanks for confirming");
    expect(payload.text).toContain("Unsubscribe:");
    expect(payload.headers["List-Unsubscribe"]).toContain("/unsubscribe?token=");
    expect(options.idempotencyKey).toBe(welcomeIdempotencyKey("reader@example.com", "aviation"));
    expect(`${payload.subject}\n${payload.html}\n${payload.text}`).not.toMatch(/[\u2013\u2014]/);
  });

  it("sends a plain welcome when the segment has no published issue", async () => {
    const result = await confirmSubscription(confirmToken("reader@example.com", "warehousing"));
    expect(result.ok).toBe(true);
    expect(resend.send).toHaveBeenCalledTimes(1);
    const payload = resend.send.mock.calls[0][0] as { subject: string; html: string };
    expect(payload.subject).toBe("Welcome to Vizonix - Warehousing");
    expect(payload.html).toContain("No issue is in the archive yet");
    expect(payload.html).toContain("https://vizonix.com/warehousing");
    expect(payload.html).not.toContain("Veryon");
  });

  it("does not send a second welcome when the contact is already confirmed for that segment", async () => {
    resend.get.mockResolvedValue({ data: { unsubscribed: false }, error: null });
    resend.add.mockResolvedValue({
      data: null,
      error: { message: "Contact already exists in this segment", name: "validation_error", statusCode: 409 },
    });
    const result = await confirmSubscription(confirmToken("reader@example.com", "aviation"));
    expect(result.ok).toBe(true);
    expect(resend.update).toHaveBeenCalled();
    expect(resend.send).not.toHaveBeenCalled();
  });

  it("still welcomes a newly joined segment when the contact is already confirmed elsewhere", async () => {
    resend.get.mockResolvedValue({ data: { unsubscribed: false }, error: null });
    const result = await confirmSubscription(confirmToken("reader@example.com", "legal"));
    expect(result.ok).toBe(true);
    expect(resend.send).toHaveBeenCalledTimes(1);
    const payload = resend.send.mock.calls[0][0] as { subject: string; html: string };
    expect(payload.subject).toBe("Welcome to Vizonix - Legal");
    expect(payload.html).not.toContain("ClauseHarbor");
    expect(payload.html).not.toContain("Northline");
  });

  it("keeps the confirmation when the welcome send fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    resend.send.mockResolvedValueOnce({
      data: null,
      error: { message: "Mailbox rejected", name: "application_error", statusCode: 500 },
    });
    const rejected = await confirmSubscription(confirmToken("reader@example.com", "aviation"));
    expect(rejected.ok).toBe(true);

    resend.send.mockRejectedValueOnce(new Error("network down"));
    const thrown = await confirmSubscription(confirmToken("other@example.com", "aviation"));
    expect(thrown.ok).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
