import { isIsoDate } from "@/lib/dates";
import type { Issue, SectionSponsor, SponsorCreative } from "@/lib/schema";
import { isLiveBookingStatus, sectionSpotIndex } from "@/lib/sponsor-placements";
import {
  renderedIssueSlotIds,
  sectionLineMax,
  sponsorCopyMax,
  sponsorCtaMax,
  sponsorNameMax,
} from "@/lib/sponsor-slots";

export type SponsorBookingCreative = {
  segment: string;
  placement: string;
  startDate: string;
  endDate: string;
  status: string;
  headline: string;
  body: string;
  cta: string;
  url: string;
  logo: string;
  createdAt: string;
};

const slotNames = renderedIssueSlotIds;

type SlotName = (typeof slotNames)[number];

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trim();
}

function usableUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "https:" || url.protocol === "http:") return trimmed;
  } catch {
    return null;
  }
  return null;
}

export function bookingCoversDate(booking: Pick<SponsorBookingCreative, "startDate" | "endDate">, date: string): boolean {
  return isIsoDate(booking.startDate) && isIsoDate(booking.endDate) && booking.startDate <= date && booking.endDate >= date;
}

function slotCreative(booking: SponsorBookingCreative): SponsorCreative | null {
  const url = usableUrl(booking.url);
  const copy = clip(booking.body, sponsorCopyMax);
  const name = clip(booking.headline, sponsorNameMax);
  if (!url || !copy || !name) return null;
  const logo = usableUrl(booking.logo);
  return {
    name,
    url,
    copy,
    cta: clip(booking.cta, sponsorCtaMax) || "Learn more",
    ctaUrl: url,
    ...(logo ? { logo } : {}),
    house: false,
  };
}

function sectionCreative(booking: SponsorBookingCreative): SectionSponsor | null {
  const url = usableUrl(booking.url);
  const name = clip(booking.headline, sponsorNameMax);
  const line = clip(booking.body || booking.headline, sectionLineMax);
  if (!url || !name || !line) return null;
  const logo = usableUrl(booking.logo);
  return { name, line, url, ...(logo ? { logo } : {}) };
}

function ranked(bookings: SponsorBookingCreative[], issue: Issue, placement: string): SponsorBookingCreative[] {
  return bookings
    .filter(
      (booking) =>
        booking.segment === issue.segment &&
        booking.placement === placement &&
        isLiveBookingStatus(booking.status) &&
        bookingCoversDate(booking, issue.date),
    )
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

/**
 * Overlay paid creatives onto one issue.
 * A booking with no usable creative leaves the house ad or the open section line in place.
 */
export function applyBookingsToIssue<T extends Issue>(issue: T, bookings: SponsorBookingCreative[]): T {
  const sponsors = { ...issue.sponsors };
  for (const name of slotNames) {
    for (const booking of ranked(bookings, issue, name)) {
      const creative = slotCreative(booking);
      if (!creative) continue;
      sponsors[name] = creative;
      break;
    }
  }

  const sections = issue.sections?.map((section, index) => {
    const spot = sectionSpotsId(index);
    if (!spot) return section;
    for (const booking of ranked(bookings, issue, spot)) {
      const sponsor = sectionCreative(booking);
      if (!sponsor) continue;
      return { ...section, sponsor };
    }
    return section;
  });

  return { ...issue, sponsors, ...(sections ? { sections } : {}) };
}

function sectionSpotsId(index: number): string | null {
  const id = String(index + 1).padStart(2, "0");
  return sectionSpotIndex(id) === index ? id : null;
}

export function isSlotName(value: string): value is SlotName {
  return (slotNames as readonly string[]).includes(value);
}
