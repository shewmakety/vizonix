import { placements, type Placement } from "@/lib/rate-card";

/** Numbered section inventory. The same spots exist for every segment. */
export const sectionSpots = ["01", "02", "03", "04", "05", "06", "07", "08"] as const;

export type SectionSpot = (typeof sectionSpots)[number];

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

/** Rate-card placements still drive checkout. Section spots are admin inventory. */
export function isCheckoutPlacement(value: string): value is Placement {
  return (placements as readonly string[]).includes(value);
}

export function sectionSpotIndex(placement: string): number | null {
  const index = sectionSpots.indexOf(placement as SectionSpot);
  return index >= 0 ? index : null;
}
