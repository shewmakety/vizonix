import { placements, type Placement } from "@/lib/rate-card";
import {
  isSectionSpot,
  sectionSpots,
  type RenderedFormatId,
  type SectionSpot,
} from "@/lib/sponsor-slots";

export { sectionSpots, isSectionSpot };
export type { SectionSpot };

/** Primary, secondary, and the numbered section spots the issue template renders. */
export const bookingPlacements = [...placements, ...sectionSpots] as const;

export type BookingPlacement = (typeof bookingPlacements)[number];

export const bookingStatuses = ["pending", "paid", "active", "comped", "cancelled"] as const;

export type BookingStatus = (typeof bookingStatuses)[number];

/** Statuses that render on an issue and count as sold on the calendar. */
export const liveBookingStatuses = ["paid", "active", "comped"] as const;

export const inquiryStatuses = ["new", "read", "closed"] as const;

export type InquiryStatus = (typeof inquiryStatuses)[number];

const bookingPlacementSet = new Set<string>(bookingPlacements);

export function isBookingPlacement(value: string): value is BookingPlacement {
  return bookingPlacementSet.has(value);
}

export function isBookingStatus(value: string): value is BookingStatus {
  return (bookingStatuses as readonly string[]).includes(value);
}

export function isLiveBookingStatus(value: string): boolean {
  return (liveBookingStatuses as readonly string[]).includes(value);
}

export function isInquiryStatus(value: string): value is InquiryStatus {
  return (inquiryStatuses as readonly string[]).includes(value);
}

/** Priced newsletter slots. Section spots are quoted through the inquiry form. */
export function isCheckoutPlacement(value: string): value is Placement {
  return (placements as readonly string[]).includes(value);
}

export function sectionSpotIndex(placement: string): number | null {
  const index = sectionSpots.indexOf(placement as SectionSpot);
  return index >= 0 ? index : null;
}

export type ResolvedPublicPlacement = {
  placement: BookingPlacement;
  format: RenderedFormatId;
};

/**
 * Public forms send primary, secondary, or section.
 * A section sponsor also sends the numbered section. A spot id such as 01 already names that section.
 * The allowed list comes from the live segment, not a fixed industry.
 */
export function resolvePublicPlacement(
  placementRaw: string,
  sectionRaw: string,
  allowedSpots: readonly string[],
): { ok: true; value: ResolvedPublicPlacement } | { ok: false; error: string } {
  const placement = placementRaw.trim();
  const section = sectionRaw.trim();
  if (placement === "primary" || placement === "secondary") {
    return { ok: true, value: { placement, format: placement } };
  }
  if (placement === "section" || isSectionSpot(placement)) {
    const spot = placement === "section" ? section : placement;
    if (!spot || !allowedSpots.includes(spot)) {
      return { ok: false, error: "Choose the numbered section." };
    }
    return { ok: true, value: { placement: spot as BookingPlacement, format: "section" } };
  }
  return { ok: false, error: "Choose a placement." };
}
