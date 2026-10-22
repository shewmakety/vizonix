import { addDays, isIsoDate, todayInNewYork, weekdayOf } from "@/lib/dates";
import { isLiveBookingStatus } from "@/lib/sponsor-placements";
import type { Booking, Sponsor } from "@/lib/sponsor-store";

export type DayMark = {
  date: string;
  kind: "open" | "sold" | "held";
  labels: string[];
};

export function mondayOnOrBefore(isoDate: string): string {
  const day = weekdayOf(isoDate);
  const delta = day === 0 ? 6 : day - 1;
  return addDays(isoDate, -delta);
}

export function availabilityAnchor(raw: string | undefined, now = new Date()): string {
  const today = todayInNewYork(now);
  if (raw && isIsoDate(raw)) return mondayOnOrBefore(raw);
  return mondayOnOrBefore(today);
}

function labelFor(booking: Booking, sponsors: Map<string, string>): string {
  if (booking.headline.trim()) return booking.headline.trim();
  if (booking.sponsorId) {
    const company = sponsors.get(booking.sponsorId);
    if (company) return company;
  }
  return "Booked";
}

/** Six-week grid by default. Cancelled bookings do not fill a day. */
export function markAvailability(input: {
  start: string;
  weeks?: number;
  bookings: Booking[];
  sponsors: Sponsor[];
}): DayMark[] {
  const weeks = input.weeks ?? 6;
  const sponsors = new Map(input.sponsors.map((sponsor) => [sponsor.id, sponsor.company]));
  const days: DayMark[] = [];
  for (let offset = 0; offset < weeks * 7; offset += 1) {
    const date = addDays(input.start, offset);
    const covering = input.bookings.filter(
      (booking) => booking.status !== "cancelled" && booking.startDate <= date && booking.endDate >= date,
    );
    const sold = covering.filter((booking) => isLiveBookingStatus(booking.status));
    const held = covering.filter((booking) => booking.status === "pending");
    const source = sold.length > 0 ? sold : held;
    days.push({
      date,
      kind: sold.length > 0 ? "sold" : held.length > 0 ? "held" : "open",
      labels: source.map((booking) => labelFor(booking, sponsors)),
    });
  }
  return days;
}
