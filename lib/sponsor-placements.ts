import { placements, type Placement } from "@/lib/rate-card";
import { isSectionSpot, sectionSpots, type SectionSpot } from "@/lib/sponsor-slots";

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
