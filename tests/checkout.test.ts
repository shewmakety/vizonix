import { describe, expect, it } from "vitest";
import { parseCheckoutRequest, reservationWindow, type PreparedCheckout } from "@/lib/checkout";
import { isMonday } from "@/lib/dates";
import { buildCheckoutSession, countFoundingSessions, type CheckoutSessionDraft } from "@/lib/stripe-checkout";

const now = new Date("2026-10-14T15:00:00.000Z");

describe("checkout dates", () => {
  it("treats a newsletter week as Monday through Friday", () => {
    expect(isMonday("2026-10-19")).toBe(true);
    expect(isMonday("2026-10-14")).toBe(false);
    expect(reservationWindow("primary", "2026-10-19", 1)).toEqual({
      startDate: "2026-10-19",
      endDate: "2026-10-23",
    });
    expect(reservationWindow("primary", "2026-10-19", 2).endDate).toBe("2026-10-30");
    expect(reservationWindow("banner", "2026-10-14", 1).endDate).toBe("2026-10-20");
    expect(reservationWindow("featured", "2026-10-14", 1).endDate).toBe("2026-11-12");
  });

  it("rejects a midweek start for the primary slot and accepts a future Monday", () => {
    const midweek = parseCheckoutRequest(
      {
        segment: "aviation",
        placement: "primary",
        startDate: "2026-10-14",
        email: "buyer@firm.example",
        quantity: 1,
      },
      { now, reservations: [] },
    );
    expect(midweek.ok).toBe(false);

    const monday = parseCheckoutRequest(
      {
        segment: "aviation",
        placement: "primary",
        startDate: "2026-10-19",
        email: "buyer@firm.example",
        quantity: 1,
      },
      { now, reservations: [] },
    );
    expect(monday.ok).toBe(true);
    if (monday.ok) expect(monday.value.endDate).toBe("2026-10-23");
  });

  it("blocks an overlapping reservation and ignores the honeypot", () => {
    const conflict = parseCheckoutRequest(
      {
        segment: "aviation",
        placement: "primary",
        startDate: "2026-10-19",
        email: "buyer@firm.example",
      },
      {
        now,
        reservations: [
          {
            id: "cs_test",
            stripeSessionId: "cs_test",
            segment: "aviation",
            placement: "primary",
            startDate: "2026-10-19",
            endDate: "2026-10-23",
            founding: false,
            exclusivityRequested: false,
            status: "paid",
            createdAt: "2026-10-14T00:00:00.000Z",
          },
        ],
      },
    );
    expect(conflict.ok).toBe(false);
    if (!conflict.ok) expect(conflict.status).toBe(409);

    const bot = parseCheckoutRequest(
      { company_website: "https://spam.example", email: "nope" },
      { now, reservations: [] },
    );
    expect(bot.ok).toBe(true);
    if (bot.ok) expect(bot.value.honeypot).toBe(true);
  });

  it("refuses a section that is not open", () => {
    for (const segment of ["warehousing", "legal"]) {
      const planned = parseCheckoutRequest(
        {
          segment,
          placement: "primary",
          startDate: "2026-10-19",
          email: "buyer@firm.example",
        },
        { now, reservations: [] },
      );
      expect(planned.ok).toBe(false);
    }
  });
});

function featuredOrder(overrides: Partial<PreparedCheckout> = {}): PreparedCheckout {
  return {
    segment: "aviation",
    placement: "featured",
    startDate: "2026-10-14",
    endDate: "2026-11-12",
    quantity: 1,
    email: "buyer@firm.example",
    company: "Hangar Co",
    adCopyUrl: "https://hangar.example/tool",
    founding: false,
    exclusivityRequested: false,
    honeypot: false,
    ...overrides,
  };
}

function expectNoStack(session: CheckoutSessionDraft) {
  const stacked = Boolean(session.discounts?.length) && session.allow_promotion_codes === true;
  expect(stacked).toBe(false);
}

describe("featured checkout", () => {
  it("requires the company and URL, and allows another featured listing in the same window", () => {
    const missing = parseCheckoutRequest(
      {
        segment: "aviation",
        placement: "featured",
        startDate: "2026-10-14",
        email: "buyer@firm.example",
        quantity: 1,
      },
      { now, reservations: [] },
    );
    expect(missing.ok).toBe(false);

    const manyMonths = parseCheckoutRequest(
      {
        segment: "aviation",
        placement: "featured",
        startDate: "2026-10-14",
        email: "buyer@firm.example",
        company: "Hangar Co",
        adCopyUrl: "https://hangar.example/tool",
        quantity: 2,
      },
      { now, reservations: [] },
    );
    expect(manyMonths.ok).toBe(false);

    const overlap = parseCheckoutRequest(
      {
        segment: "aviation",
        placement: "featured",
        startDate: "2026-10-14",
        email: "buyer@firm.example",
        company: "Hangar Co",
        adCopyUrl: "https://hangar.example/tool",
        exclusivity: true,
      },
      {
        now,
        reservations: [
          {
            id: "cs_featured",
            stripeSessionId: "cs_featured",
            segment: "aviation",
            placement: "featured",
            startDate: "2026-10-14",
            endDate: "2026-11-12",
            founding: true,
            exclusivityRequested: false,
            status: "paid",
            createdAt: "2026-10-14T00:00:00.000Z",
          },
        ],
      },
    );
    expect(overlap.ok).toBe(true);
    if (overlap.ok) expect(overlap.value.exclusivityRequested).toBe(false);

    const accepted = parseCheckoutRequest(
      {
        segment: "aviation",
        placement: "featured",
        startDate: "2026-10-14",
        email: "buyer@firm.example",
        company: "Hangar Co",
        adCopyUrl: "https://hangar.example/tool",
        exclusivity: true,
      },
      { now, reservations: [] },
    );
    expect(accepted.ok).toBe(true);
    if (accepted.ok) {
      expect(accepted.value.endDate).toBe("2026-11-12");
      expect(accepted.value.exclusivityRequested).toBe(false);
    }
  });

  it("sells Featured as a subscription and does not stack the founding discount", () => {
    const prices = {
      standardPrice: "price_standard",
      foundingPrice: "price_founding",
      promotionCode: "promo_founding",
    };
    const founding = buildCheckoutSession(featuredOrder({ founding: true }), prices, 3);
    expect(founding.ok).toBe(true);
    if (founding.ok) {
      expect(founding.session.mode).toBe("subscription");
      expect(founding.session.line_items).toEqual([{ price: "price_standard", quantity: 1 }]);
      expect(founding.session.discounts).toEqual([{ promotion_code: "promo_founding" }]);
      expect(founding.session.allow_promotion_codes).toBeUndefined();
      expect(founding.session.subscription_data?.metadata.founding).toBe("true");
      expect(founding.session.metadata.company).toBe("Hangar Co");
      expectNoStack(founding.session);
    }

    const priceOnly = buildCheckoutSession(
      featuredOrder({ founding: true }),
      { standardPrice: "price_standard", foundingPrice: "price_founding" },
      0,
    );
    expect(priceOnly.ok).toBe(true);
    if (priceOnly.ok) {
      expect(priceOnly.session.line_items).toEqual([{ price: "price_founding", quantity: 1 }]);
      expect(priceOnly.session.discounts).toBeUndefined();
      expect(priceOnly.session.allow_promotion_codes).toBe(false);
      expectNoStack(priceOnly.session);
    }

    const full = buildCheckoutSession(featuredOrder({ founding: true }), prices, 10);
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.status).toBe(409);

    const standard = buildCheckoutSession(
      featuredOrder({ placement: "primary", quantity: 2, endDate: "2026-10-30" }),
      { standardPrice: "price_primary" },
      0,
    );
    expect(standard.ok).toBe(true);
    if (standard.ok) {
      expect(standard.session.mode).toBe("payment");
      expect(standard.session.line_items).toEqual([{ price: "price_primary", quantity: 2 }]);
      expect(standard.session.allow_promotion_codes).toBe(true);
      expect(standard.session.subscription_data).toBeUndefined();
      expectNoStack(standard.session);
    }

    expect(countFoundingSessions([{ metadata: { founding: "true" } }, { metadata: { founding: "false" } }])).toBe(1);
  });
});
