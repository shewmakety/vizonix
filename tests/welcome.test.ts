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

import { welcomePlainMessage } from "@/lib/email";
import { confirmSubscription, welcomeIdempotencyKey } from "@/lib/subscribe";

const envKeys = [
  "TOKEN_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "RESEND_SEGMENT_ID_AVIATION",
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
    process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
    process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
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
    expect(resend.send).toHaveBeenCalledTimes(2);
    const welcomeCall = resend.send.mock.calls.find(
      (call) => (call[0] as { to?: string[] }).to?.[0] === "reader@example.com",
    );
    expect(welcomeCall).toBeTruthy();
    const [payload, options] = welcomeCall as [
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
    expect(payload.from).toBe("Vizonix <admin@vizonix.com>");
    expect(payload.to).toEqual(["reader@example.com"]);
    expect(payload.subject).toBe("Welcome to Vizonix - here's the latest Aviation issue");
    expect(payload.html).toContain("Thanks for confirming");
    expect(payload.html).toContain("short AI briefing every weekday morning for Aviation");
    expect(payload.html).toContain("admin@vizonix.com");
    expect(payload.html).toContain(
      "The AI company behind the FAA traffic tool SMART raised $325 million, and it already runs operations software for Delta, Alaska and United",
    );
    expect(payload.html).toContain("https://vizonix.com/aviation/issues/2026-10-26");
    expect(payload.html).toContain("https://vizonix.com/aviation/toolbox?src=email");
    expect(payload.html).toContain("The Vizonix Toolbox");
    expect(payload.html).toContain("Open the Toolbox");
    expect(payload.html).not.toContain("Visit the Toolbox");
    expect(payload.html).toContain(">READ ON WEB<");
    expect(payload.text).toContain("Open the Toolbox: https://vizonix.com/aviation/toolbox?src=email");
    expect(payload.text).toContain("READ ON WEB: https://vizonix.com/aviation/issues/2026-10-26");
    expect(payload.html).toContain("/aviation/unsubscribe?token=");
    expect(payload.html).toContain("Contact us at:");
    expect(payload.html).toContain(">CUSTOMIZE<");
    expect(payload.html).not.toContain("Manage your topics");
    expect(payload.html).toContain("/preferences?token=");
    expect(payload.html).not.toContain("{{{RESEND_UNSUBSCRIBE_URL}}}");
    expect(payload.text).toContain("Thanks for confirming");
    expect(payload.text).toContain("Unsubscribe:");
    expect(payload.headers["List-Unsubscribe"]).toContain("/api/unsubscribe?token=");
    expect(payload.headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");
    expect(options.idempotencyKey).toBe(welcomeIdempotencyKey("reader@example.com", "aviation"));
    expect(`${payload.subject}\n${payload.html}\n${payload.text}`).not.toMatch(/[\u2013\u2014]/);
    const owner = resend.send.mock.calls.find((call) =>
      String((call[0] as { subject?: string }).subject).startsWith("New Vizonix subscriber:"),
    );
    expect(owner).toBeTruthy();
    const ownerPayload = owner?.[0] as { to: string[]; subject: string; from: string };
    expect(ownerPayload.from).toBe("Vizonix <admin@vizonix.com>");
    expect(ownerPayload.to).toEqual(["admin@vizonix.com", "tyshewmake@gmail.com"]);
    expect(ownerPayload.subject).toBe("New Vizonix subscriber: reader@example.com (Aviation)");
  });

  it("writes a plain welcome when a section has no published issue", () => {
    const message = welcomePlainMessage("Field service", "https://vizonix.com/field-service", "https://vizonix.com/field-service/unsubscribe");
    expect(message.subject).toBe("Welcome to Vizonix - Field service");
    expect(message.html).toContain("No issue is in the archive yet");
    expect(message.html).toContain("https://vizonix.com/field-service");
    expect(message.html).toContain("admin@vizonix.com");
    expect(message.html).not.toContain("Veryon");
  });

  it("rejects a confirmation for a section that is not live", async () => {
    const result = await confirmSubscription(confirmToken("reader@example.com", "warehousing"));
    expect(result.ok).toBe(false);
    expect(resend.send).not.toHaveBeenCalled();
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

  it("rejects a second unknown section the same way", async () => {
    resend.get.mockResolvedValue({ data: { unsubscribed: false }, error: null });
    const result = await confirmSubscription(confirmToken("reader@example.com", "legal"));
    expect(result.ok).toBe(false);
    expect(resend.send).not.toHaveBeenCalled();
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
