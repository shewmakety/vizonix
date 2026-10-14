import { z } from "zod";
import {
  findConflict,
  type Reservation,
} from "@/lib/bookings";
import { addDays, isIsoDate, isMonday, todayInNewYork } from "@/lib/dates";
import { getPlacement, placements, type Placement } from "@/lib/rate-card";
import { featuredSegment, getSegment } from "@/lib/segments";

const emailSchema = z.string().trim().email();

export type PreparedCheckout = {
  segment: string;
  placement: Placement;
  startDate: string;
  endDate: string;
  quantity: number;
  email: string;
  company: string;
  adCopyUrl: string;
  founding: boolean;
  exclusivityRequested: boolean;
  honeypot: boolean;
};

function flag(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function reservationWindow(
  placement: Placement,
  startDate: string,
  quantity: number,
): { startDate: string; endDate: string } {
  if (placement === "featured") {
    return { startDate, endDate: addDays(startDate, 30 * quantity - 1) };
  }
  if (placement === "banner") {
    return { startDate, endDate: addDays(startDate, 7 * quantity - 1) };
  }
  return { startDate, endDate: addDays(startDate, 7 * (quantity - 1) + 4) };
}

export function mondayRequired(placement: Placement): boolean {
  return placement !== "banner" && placement !== "featured";
}

export function parseCheckoutRequest(
  raw: unknown,
  options: { now?: Date; reservations: Reservation[] },
): { ok: true; value: PreparedCheckout } | { ok: false; status: number; error: string } {
  const body = asRecord(raw);
  const honeypot = String(body.company_website ?? body.companyWebsite ?? "").trim();
  if (honeypot) {
    return {
      ok: true,
      value: {
        segment: featuredSegment().slug,
        placement: "primary",
        startDate: "2099-01-05",
        endDate: "2099-01-09",
        quantity: 1,
        email: "hidden@example.com",
        company: "",
        adCopyUrl: "",
        founding: false,
        exclusivityRequested: false,
        honeypot: true,
      },
    };
  }

  const segmentSlug = String(body.segment ?? "").trim();
  const segment = getSegment(segmentSlug);
  if (!segment) return { ok: false, status: 400, error: "Choose a section." };
  if (segment.status !== "active") {
    return { ok: false, status: 400, error: "That section is not open for sponsorship yet." };
  }

  const placementId = String(body.placement ?? "").trim();
  if (!placements.includes(placementId as Placement) || !getPlacement(placementId)) {
    return { ok: false, status: 400, error: "Choose a placement." };
  }
  const placement = placementId as Placement;

  const startDate = String(body.startDate ?? body.weekStart ?? "").trim();
  if (!isIsoDate(startDate)) {
    return { ok: false, status: 400, error: "Enter the start date as YYYY-MM-DD." };
  }
  if (mondayRequired(placement) && !isMonday(startDate)) {
    return {
      ok: false,
      status: 400,
      error: "Newsletter weeks start on Monday. Pick the Monday the week begins.",
    };
  }

  const today = todayInNewYork(options.now ?? new Date());
  if (startDate < today) {
    return { ok: false, status: 400, error: "That date is already past." };
  }
  if (startDate > addDays(today, 370)) {
    return { ok: false, status: 400, error: "Pick a start date within the next year." };
  }

  const quantity = Number(body.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 12) {
    return { ok: false, status: 400, error: "Quantity must be a whole number from 1 to 12." };
  }

  const email = String(body.email ?? "").trim().toLowerCase();
  if (!emailSchema.safeParse(email).success) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  const company = String(body.company ?? "").trim().slice(0, 120);
  const adCopyUrl = String(body.adCopyUrl ?? "").trim().slice(0, 500);
  if (adCopyUrl) {
    try {
      const url = new URL(adCopyUrl);
      if (url.protocol !== "https:" && url.protocol !== "http:") {
        return { ok: false, status: 400, error: "Ad copy URL must start with http or https." };
      }
    } catch {
      return { ok: false, status: 400, error: "Ad copy URL is not a valid link." };
    }
  }

  const window = reservationWindow(placement, startDate, quantity);
  const conflict = findConflict(options.reservations, {
    segment: segment.slug,
    placement,
    startDate: window.startDate,
    endDate: window.endDate,
  });
  if (conflict) {
    return {
      ok: false,
      status: 409,
      error: `That ${placement} placement is already reserved from ${conflict.startDate} through ${conflict.endDate}.`,
    };
  }

  return {
    ok: true,
    value: {
      segment: segment.slug,
      placement,
      startDate: window.startDate,
      endDate: window.endDate,
      quantity,
      email,
      company,
      adCopyUrl,
      founding: flag(body.founding),
      exclusivityRequested: flag(body.exclusivity),
      honeypot: false,
    },
  };
}
