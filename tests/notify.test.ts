import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signToken } from "@/lib/tokens";

const resend = vi.hoisted(() => ({
  send: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  add: vi.fn(),
}));

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = { send: resend.send };
      contacts = {
        get: resend.get,
        create: resend.create,
        update: resend.update,
        segments: { add: resend.add },
      };
    },
  };
});

import type { Reservation } from "@/lib/bookings";
import { notifyFrom, notifyOps, notifyRecipients, noticeHtml } from "@/lib/notify";
import { manualCheckoutNotice, purchaseNotice, type PaidCheckout } from "@/lib/owner-alerts";
import { confirmSubscription, startDoubleOptIn } from "@/lib/subscribe";

const envKeys = [
  "TOKEN_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "NOTIFY_EMAIL",
  "OPS_EMAIL",
  "RESEND_SEGMENT_ID_AVIATION",
  "NEXT_PUBLIC_SITE_URL",
] as const;

const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "cs_test_1",
    stripeSessionId: "cs_test_1",
    segment: "aviation",
    placement: "primary",
    startDate: "2026-10-19",
    endDate: "2026-10-25",
    founding: true,
    exclusivityRequested: false,
    status: "paid",
    createdAt: "2026-10-16T16:00:00.000Z",
    ...overrides,
  };
}

describe("owner notices", () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = "notify-test-secret";
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Vizonix <admin@vizonix.com>";
    process.env.RESEND_SEGMENT_ID_AVIATION = "seg_aviation";
    process.env.NEXT_PUBLIC_SITE_URL = "https://vizonix.com";
    delete process.env.NOTIFY_EMAIL;
    delete process.env.OPS_EMAIL;
    resend.send.mockReset();
    resend.get.mockReset();
    resend.create.mockReset();
    resend.update.mockReset();
    resend.add.mockReset();
    resend.send.mockResolvedValue({ data: { id: "email_1" }, error: null });
    resend.get.mockResolvedValue({ data: { unsubscribed: true, first_name: "Ada" }, error: null });
    resend.create.mockResolvedValue({ data: { id: "contact" }, error: null });
    resend.update.mockResolvedValue({ data: { id: "contact" }, error: null });
    resend.add.mockResolvedValue({ data: { id: "membership" }, error: null });
  });

  afterEach(() => {
    for (const key of envKeys) {
      const value = previousEnv[key];
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("defaults owner mail to both addresses and uses EMAIL_FROM", () => {
    expect(notifyRecipients()).toEqual(["admin@vizonix.com", "tyshewmake@gmail.com"]);
    expect(notifyFrom()).toBe("Vizonix <admin@vizonix.com>");
    process.env.NOTIFY_EMAIL = " one@example.com, two@example.com, one@example.com, ";
    expect(notifyRecipients()).toEqual(["one@example.com", "two@example.com"]);
    delete process.env.NOTIFY_EMAIL;
    process.env.OPS_EMAIL = "desk@example.com";
    expect(notifyRecipients()).toEqual([
      "admin@vizonix.com",
      "tyshewmake@gmail.com",
      "desk@example.com",
    ]);
  });

  it("sends a subscriber alert only after confirm, and still confirms if that send fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const started = await startDoubleOptIn({
      email: "reader@example.com",
      segment: "aviation",
      firstName: "Ada",
    });
    expect(started).toEqual({ ok: true, status: "confirmation_sent" });
    expect(resend.send).toHaveBeenCalledTimes(1);
    expect((resend.send.mock.calls[0][0] as { subject: string }).subject).toBe(
      "Confirm your Vizonix Aviation briefing",
    );

    resend.send.mockClear();
    const token = signToken(
      { email: "reader@example.com", segment: "aviation", purpose: "confirm" },
      "notify-test-secret",
    );
    const confirmed = await confirmSubscription(token, { source: "https://vizonix.com/aviation" });
    expect(confirmed.ok).toBe(true);
    const owner = resend.send.mock.calls
      .map((call) => call[0] as { to: string[]; subject: string; text: string; html: string; from: string })
      .find((payload) => payload.subject.startsWith("New Vizonix subscriber:"));
    expect(owner).toBeTruthy();
    expect(owner?.from).toBe("Vizonix <admin@vizonix.com>");
    expect(owner?.to).toEqual(["admin@vizonix.com", "tyshewmake@gmail.com"]);
    expect(owner?.subject).toBe("New Vizonix subscriber: reader@example.com (Aviation)");
    expect(owner?.text).toContain("Email: reader@example.com");
    expect(owner?.text).toContain("Name: Ada");
    expect(owner?.text).toContain("Segment: Aviation");
    expect(owner?.text).toContain("Confirmed:");
    expect(owner?.text).toContain("Source: https://vizonix.com/aviation");
    expect(owner?.text).not.toMatch(/subscriber count|Confirmed subscribers/i);
    expect(owner?.html).toContain("Name: Ada");
    expect(`${owner?.subject}\n${owner?.text}\n${owner?.html}`).not.toMatch(/[\u2013\u2014]/);
    expect(owner?.html).not.toContain("hello@vizonix.com");

    resend.send.mockClear();
    resend.get.mockResolvedValue({ data: { unsubscribed: false, first_name: "Ada" }, error: null });
    resend.add.mockResolvedValue({
      data: null,
      error: { message: "Contact already exists in this segment", name: "validation_error", statusCode: 409 },
    });
    const repeat = await confirmSubscription(token, { source: "https://vizonix.com/aviation" });
    expect(repeat.ok).toBe(true);
    expect(resend.send).not.toHaveBeenCalled();

    resend.get.mockResolvedValue({ data: { unsubscribed: true, first_name: null }, error: null });
    resend.add.mockResolvedValue({ data: { id: "membership" }, error: null });
    resend.send.mockRejectedValue(new Error("network down"));
    const other = signToken(
      { email: "other@example.com", segment: "aviation", purpose: "confirm" },
      "notify-test-secret",
    );
    const failedAlert = await confirmSubscription(other);
    expect(failedAlert.ok).toBe(true);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it("describes a one-time founding purchase and a subscription", () => {
    const session: PaidCheckout = {
      id: "cs_test_1",
      mode: "payment",
      amount_total: 15000,
      currency: "usd",
      customer_email: "buyer@example.com",
      customer_details: { name: "Pat Buyer", email: "buyer@example.com" },
      payment_intent: "pi_123",
      metadata: {
        company: "Hangar Co",
        ad_copy_url: "https://example.com/ad",
        founding: "true",
      },
      discounts: [{ promotion_code: "promo_founding" }],
      total_details: { amount_discount: 15000 },
    };
    const notice = purchaseNotice({
      session,
      reservation: reservation(),
      saved: { stored: "github", conflict: null, duplicate: false },
    });
    expect(notice.subject).toBe("New Vizonix sponsor purchase: Primary sponsor - $150.00");
    expect(notice.text).toContain("Buyer: Pat Buyer");
    expect(notice.text).toContain("Email: buyer@example.com");
    expect(notice.text).toContain("Company: Hangar Co");
    expect(notice.text).toContain("Slot: primary");
    expect(notice.text).toContain("Segment: aviation");
    expect(notice.text).toContain("Amount paid: $150.00");
    expect(notice.text).toContain("Founding: yes");
    expect(notice.text).toContain("FOUNDING promo: yes");
    expect(notice.text).toContain("Promotion code: promo_founding");
    expect(notice.text).toContain("Billing: one-time");
    expect(notice.text).toContain("Requested dates: 2026-10-19 through 2026-10-25");
    expect(notice.text).toContain("Creative: https://example.com/ad");
    expect(notice.text).toContain("Stripe session: cs_test_1");
    expect(notice.text).toContain("Payment: pi_123");
    expect(notice.text).toContain("https://dashboard.stripe.com/payments/pi_123");
    expect(notice.text).not.toContain("/subscriptions/");
    expect(notice.text).not.toMatch(/[\u2013\u2014]/);

    const featured = purchaseNotice({
      session: {
        id: "cs_sub",
        mode: "subscription",
        amount_total: 7500,
        currency: "usd",
        customer_details: { name: "Sam", email: "sam@example.com" },
        subscription: { id: "sub_123" },
        metadata: { founding: "true", company: "Tool Co" },
      },
      reservation: reservation({
        id: "cs_sub",
        stripeSessionId: "cs_sub",
        placement: "secondary",
        founding: true,
      }),
      saved: {
        stored: "local",
        conflict: null,
        duplicate: false,
      },
    });
    expect(featured.subject).toBe("New Vizonix sponsor purchase: Secondary sponsor - $75.00");
    expect(featured.text).toContain("Billing: subscription");
    expect(featured.text).toContain("FOUNDING promo: no");
    expect(featured.text).toContain("https://dashboard.stripe.com/subscriptions/sub_123");
    expect(featured.text).not.toContain("Featured listing:");

    const manual = manualCheckoutNotice({
      id: "cs_manual",
      mode: "payment",
      amount_total: 10000,
      payment_intent: { id: "pi_manual" },
      customer_details: { email: "pay@example.com", name: "Lee" },
    });
    expect(manual.subject).toBe("Vizonix checkout needs a manual booking");
    expect(manual.text).toContain("Amount paid: $100.00");
    expect(manual.text).toContain("https://dashboard.stripe.com/payments/pi_manual");
  });

  it("sends the purchase notice as html and does not throw when Resend fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    process.env.NOTIFY_EMAIL = "admin@vizonix.com,tyshewmake@gmail.com";
    const sent = await notifyOps("New Vizonix sponsor purchase: Primary sponsor - $150.00", "Buyer: Pat\n<script>");
    expect(sent).toBe(true);
    const payload = resend.send.mock.calls[0][0] as { html: string; to: string[]; from: string };
    expect(payload.from).toBe("Vizonix <admin@vizonix.com>");
    expect(payload.to).toEqual(["admin@vizonix.com", "tyshewmake@gmail.com"]);
    expect(payload.html).toBe(noticeHtml("Buyer: Pat\n<script>"));
    expect(payload.html).toContain("&lt;script&gt;");
    expect(payload.html).not.toContain("<script>");

    resend.send.mockRejectedValueOnce(new Error("mailbox down"));
    const failed = await notifyOps("New Vizonix sponsor purchase: Primary sponsor - $150.00", "Buyer: Pat");
    expect(failed).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
