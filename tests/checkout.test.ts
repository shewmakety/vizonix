import { describe, expect, it } from "vitest";
import { parseCheckoutRequest, reservationWindow } from "@/lib/checkout";
import { isMonday } from "@/lib/dates";

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
        segment: "legal",
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
        segment: "legal",
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
        segment: "legal",
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
            segment: "legal",
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
    const planned = parseCheckoutRequest(
      {
        segment: "warehousing",
        placement: "primary",
        startDate: "2026-10-19",
        email: "buyer@firm.example",
      },
      { now, reservations: [] },
    );
    expect(planned.ok).toBe(false);
  });
});
