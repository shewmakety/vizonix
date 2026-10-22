import { describe, expect, it } from "vitest";
import { findConflict, reservationFromSession, type Reservation } from "@/lib/bookings";

const existing: Reservation = {
  id: "cs_existing",
  stripeSessionId: "cs_existing",
  segment: "legal",
  placement: "secondary",
  startDate: "2026-10-19",
  endDate: "2026-10-23",
  founding: true,
  exclusivityRequested: false,
  status: "paid",
  createdAt: "2026-10-14T00:00:00.000Z",
};

describe("reservations", () => {
  it("reads checkout metadata into a reservation without keeping the email", () => {
    const reservation = reservationFromSession({
      id: "cs_new",
      created: 1760430000,
      metadata: {
        segment: "legal",
        placement: "primary",
        week_start: "2026-10-26",
        end_date: "2026-10-30",
        founding: "true",
        exclusivity: "false",
        company: "Northwind",
        ad_copy_url: "https://example.com/ad",
      },
    });
    expect(reservation).toMatchObject({
      id: "cs_new",
      segment: "legal",
      placement: "primary",
      startDate: "2026-10-26",
      endDate: "2026-10-30",
      founding: true,
    });
    expect(JSON.stringify(reservation)).not.toContain("Northwind");
    expect(JSON.stringify(reservation)).not.toContain("example.com");
  });

  it("accepts a payment-link custom field for the week", () => {
    const reservation = reservationFromSession({
      id: "cs_link",
      metadata: { segment: "legal", placement: "primary" },
      custom_fields: [{ key: "preferred_week", text: { value: "2026-11-02" } }],
    });
    expect(reservation?.startDate).toBe("2026-11-02");
    expect(reservation?.endDate).toBe("2026-11-02");
  });

  it("drops a payment for a slot the issue no longer sells", () => {
    const reservation = reservationFromSession({
      id: "cs_old",
      metadata: { segment: "legal", placement: "classified" },
      custom_fields: [{ key: "preferred_week", text: { value: "2026-11-02" } }],
    });
    expect(reservation).toBeNull();
  });

  it("detects overlapping placements only", () => {
    expect(
      findConflict([existing], {
        segment: "legal",
        placement: "secondary",
        startDate: "2026-10-21",
        endDate: "2026-10-23",
      })?.id,
    ).toBe("cs_existing");
    expect(
      findConflict([existing], {
        segment: "legal",
        placement: "primary",
        startDate: "2026-10-19",
        endDate: "2026-10-23",
      }),
    ).toBeUndefined();
  });
});
