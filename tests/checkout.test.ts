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
    expect(reservationWindow("secondary", "2026-10-19", 1).endDate).toBe("2026-10-23");
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
        company: "Hangar Co",
        adCopy: "A short line for the week.",
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
        company: "Hangar Co",
        adCopy: "A short line for the week.",
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

function weekOrder(overrides: Partial<PreparedCheckout> = {}): PreparedCheckout {
  return {
    segment: "aviation",
    placement: "primary",
    startDate: "2026-10-19",
    endDate: "2026-10-23",
    quantity: 1,
    email: "buyer@firm.example",
    company: "Hangar Co",
    adCopy: "A short line for the hangar desk.",
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

describe("checkout session", () => {
  it("rejects retired placements and quoted section spots", () => {
    for (const placement of ["featured", "banner", "bundle", "classified"]) {
      const retired = parseCheckoutRequest(
        {
          segment: "aviation",
          placement,
          startDate: "2026-10-19",
          email: "buyer@firm.example",
          quantity: 1,
        },
        { now, reservations: [] },
      );
      expect(retired.ok).toBe(false);
      if (!retired.ok) expect(retired.error).toBe("Choose a placement.");
    }
    const quoted = parseCheckoutRequest(
      {
        segment: "aviation",
        placement: "01",
        startDate: "2026-10-19",
        email: "buyer@firm.example",
      },
      { now, reservations: [] },
    );
    expect(quoted.ok).toBe(false);
    if (!quoted.ok) expect(quoted.error).toBe("That section sponsorship is quoted. Use the inquiry form.");
  });

  it("does not stack the founding discount", () => {
    const prices = {
      standardPrice: "price_standard",
      foundingPrice: "price_founding",
      promotionCode: "promo_founding",
    };
    const founding = buildCheckoutSession(weekOrder({ founding: true }), prices, 3);
    expect(founding.ok).toBe(true);
    if (founding.ok) {
      expect(founding.session.mode).toBe("payment");
      expect(founding.session.line_items).toEqual([{ price: "price_standard", quantity: 1 }]);
      expect(founding.session.discounts).toEqual([{ promotion_code: "promo_founding" }]);
      expect(founding.session.allow_promotion_codes).toBeUndefined();
      expect(founding.session.subscription_data).toBeUndefined();
      expect(founding.session.metadata.company).toBe("Hangar Co");
      expectNoStack(founding.session);
    }

    const priceOnly = buildCheckoutSession(
      weekOrder({ founding: true }),
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

    const full = buildCheckoutSession(weekOrder({ founding: true }), prices, 10);
    expect(full.ok).toBe(false);
    if (!full.ok) expect(full.status).toBe(409);

    const standard = buildCheckoutSession(
      weekOrder({ quantity: 2, endDate: "2026-10-30" }),
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
