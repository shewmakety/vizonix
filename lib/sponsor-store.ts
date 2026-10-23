import { z } from "zod";
import { adCopyError } from "@/lib/buyer-creative";
import { isIsoDate } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { Issue } from "@/lib/schema";
import { getSegment } from "@/lib/segments";
import { applyBookingsToIssue, type SponsorBookingCreative } from "@/lib/sponsor-creative";
import { numberedSectionIds } from "@/lib/sponsor-labels";
import {
  bookingStatuses,
  inquiryStatuses,
  isBookingPlacement,
  isBookingStatus,
  resolvePublicPlacement,
  isCheckoutPlacement,
  isInquiryStatus,
  isLiveBookingStatus,
  type BookingPlacement,
  type BookingStatus,
  type InquiryStatus,
} from "@/lib/sponsor-placements";
import { formatForPlacement, isSectionSpot } from "@/lib/sponsor-slots";
import { supabaseConfigured, supabaseRest } from "@/lib/supabase-admin";

const failure = "Could not reach sponsor storage.";

export type Sponsor = {
  id: string;
  company: string;
  contact: string;
  email: string;
  url: string;
  logo: string;
  createdAt: string;
  updatedAt: string;
};

export type Booking = SponsorBookingCreative & {
  id: string;
  sponsorId: string | null;
  placement: BookingPlacement;
  status: BookingStatus;
  price: number | null;
  stripeSessionId: string;
  founding: boolean;
  exclusivityRequested: boolean;
  legacyId: string;
  updatedAt: string;
};

export type Inquiry = {
  id: string;
  name: string;
  company: string;
  email: string;
  promote: string;
  adCopy: string;
  budget: string;
  message: string;
  segment: string;
  placement: string;
  status: InquiryStatus;
  createdAt: string;
  updatedAt: string;
};

export type LegacyReservation = {
  id: string;
  stripeSessionId: string;
  segment: string;
  placement: string;
  startDate: string;
  endDate: string;
  founding: boolean;
  exclusivityRequested: boolean;
  status: string;
  createdAt: string;
};

type SponsorRow = {
  id?: string;
  company?: string | null;
  contact?: string | null;
  email?: string | null;
  url?: string | null;
  logo?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type BookingRow = {
  id?: string;
  sponsor_id?: string | null;
  segment?: string | null;
  placement?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status?: string | null;
  price?: number | string | null;
  stripe_session_id?: string | null;
  headline?: string | null;
  body?: string | null;
  cta?: string | null;
  url?: string | null;
  logo?: string | null;
  founding?: boolean | null;
  exclusivity_requested?: boolean | null;
  legacy_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type InquiryRow = {
  id?: string;
  name?: string | null;
  company?: string | null;
  email?: string | null;
  promote?: string | null;
  ad_copy?: string | null;
  budget?: string | null;
  message?: string | null;
  segment?: string | null;
  placement?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return uuidPattern.test(value);
}

function text(value: string | null | undefined): string {
  return value?.trim() ?? "";
}

function money(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.round(number * 100) / 100;
}

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

function mapSponsor(row: SponsorRow): Sponsor | null {
  if (!row.id || !row.company || !row.email) return null;
  return {
    id: row.id,
    company: row.company,
    contact: text(row.contact),
    email: row.email,
    url: text(row.url),
    logo: text(row.logo),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function mapBooking(row: BookingRow): Booking | null {
  if (!row.id || !row.segment || !row.placement || !row.start_date || !row.end_date) return null;
  if (!isBookingPlacement(row.placement) || !row.status || !isBookingStatus(row.status)) return null;
  return {
    id: row.id,
    sponsorId: row.sponsor_id ?? null,
    segment: row.segment,
    placement: row.placement,
    startDate: row.start_date.slice(0, 10),
    endDate: row.end_date.slice(0, 10),
    status: row.status,
    price: money(row.price),
    stripeSessionId: text(row.stripe_session_id),
    headline: text(row.headline),
    body: text(row.body),
    cta: text(row.cta),
    url: text(row.url),
    logo: text(row.logo),
    founding: Boolean(row.founding),
    exclusivityRequested: Boolean(row.exclusivity_requested),
    legacyId: text(row.legacy_id),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function mapInquiry(row: InquiryRow): Inquiry | null {
  if (!row.id || !row.name || !row.company || !row.email || !row.promote || !row.message) return null;
  if (!row.status || !isInquiryStatus(row.status)) return null;
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    email: row.email,
    promote: row.promote,
    adCopy: text(row.ad_copy),
    budget: text(row.budget),
    message: row.message,
    segment: text(row.segment),
    placement: text(row.placement),
    status: row.status,
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
  };
}

function rowsOf<T>(value: T[] | null): T[] {
  return Array.isArray(value) ? value : [];
}

async function readRows<T>(path: string): Promise<T[]> {
  const rows = await supabaseRest<T[] | null>(path, { method: "GET", cache: "no-store", failure });
  return rowsOf(rows);
}

export async function listSponsors(): Promise<Sponsor[]> {
  const rows = await readRows<SponsorRow>("sponsors?select=*&order=company.asc&limit=500");
  return rows.flatMap((row) => {
    const sponsor = mapSponsor(row);
    return sponsor ? [sponsor] : [];
  });
}

export async function getSponsor(id: string): Promise<Sponsor | null> {
  if (!isUuid(id)) return null;
  const rows = await readRows<SponsorRow>(`sponsors?select=*&id=eq.${id}&limit=1`);
  return mapSponsor(rows[0] ?? {}) ;
}

export async function listBookings(): Promise<Booking[]> {
  const rows = await readRows<BookingRow>("bookings?select=*&order=start_date.desc&limit=1000");
  return rows.flatMap((row) => {
    const booking = mapBooking(row);
    return booking ? [booking] : [];
  });
}

export async function getBooking(id: string): Promise<Booking | null> {
  if (!isUuid(id)) return null;
  const rows = await readRows<BookingRow>(`bookings?select=*&id=eq.${id}&limit=1`);
  return mapBooking(rows[0] ?? {});
}

export async function listInquiries(): Promise<Inquiry[]> {
  const rows = await readRows<InquiryRow>("inquiries?select=*&order=created_at.desc&limit=500");
  return rows.flatMap((row) => {
    const inquiry = mapInquiry(row);
    return inquiry ? [inquiry] : [];
  });
}

export async function getInquiry(id: string): Promise<Inquiry | null> {
  if (!isUuid(id)) return null;
  const rows = await readRows<InquiryRow>(`inquiries?select=*&id=eq.${id}&limit=1`);
  return mapInquiry(rows[0] ?? {});
}

export type SponsorInput = {
  company: string;
  contact: string;
  email: string;
  url: string;
  logo: string;
};

export type BookingInput = {
  sponsorId: string | null;
  segment: string;
  placement: BookingPlacement;
  startDate: string;
  endDate: string;
  status: BookingStatus;
  price: number | null;
  stripeSessionId: string;
  headline: string;
  body: string;
  cta: string;
  url: string;
  logo: string;
  founding: boolean;
  exclusivityRequested: boolean;
};

export type InquiryInput = {
  name: string;
  company: string;
  email: string;
  promote: string;
  adCopy: string;
  budget: string;
  message: string;
  segment: string;
  placement: string;
  status: InquiryStatus;
};

function sponsorRow(input: SponsorInput, now: string): Record<string, unknown> {
  return {
    company: input.company,
    contact: input.contact,
    email: input.email,
    url: blank(input.url),
    logo: blank(input.logo),
    updated_at: now,
  };
}

function bookingRow(input: BookingInput, now: string): Record<string, unknown> {
  return {
    sponsor_id: input.sponsorId,
    segment: input.segment,
    placement: input.placement,
    start_date: input.startDate,
    end_date: input.endDate,
    status: input.status,
    price: input.price,
    stripe_session_id: blank(input.stripeSessionId),
    headline: blank(input.headline),
    body: blank(input.body),
    cta: blank(input.cta),
    url: blank(input.url),
    logo: blank(input.logo),
    founding: input.founding,
    exclusivity_requested: input.exclusivityRequested,
    updated_at: now,
  };
}

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => {
    if (!value) return true;
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a site path or an http(s) URL.");

function flag(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
  return {};
}

export function parseSponsorInput(raw: unknown): { ok: true; value: SponsorInput } | { ok: false; error: string } {
  const body = asRecord(raw);
  const parsed = z
    .object({
      company: z.string().trim().min(1).max(160),
      contact: z.string().trim().min(1).max(120),
      email: z.string().trim().email().max(200),
      url: optionalUrl.optional(),
      logo: optionalUrl.optional(),
    })
    .safeParse({
      company: body.company,
      contact: body.contact,
      email: body.email,
      url: body.url ? String(body.url) : "",
      logo: body.logo ? String(body.logo) : "",
    });
  if (!parsed.success) {
    return { ok: false, error: "Check the company, contact, email, and links." };
  }
  return {
    ok: true,
    value: {
      company: parsed.data.company,
      contact: parsed.data.contact,
      email: parsed.data.email.toLowerCase(),
      url: parsed.data.url ?? "",
      logo: parsed.data.logo ?? "",
    },
  };
}

export function parseBookingInput(raw: unknown): { ok: true; value: BookingInput } | { ok: false; error: string } {
  const body = asRecord(raw);
  const segmentSlug = String(body.segment ?? "").trim();
  if (!getSegment(segmentSlug)) return { ok: false, error: "Choose a section." };
  const placement = storedPlacement(segmentSlug, String(body.placement ?? ""), String(body.section ?? ""));
  if (!placement.ok) return placement;
  if (isSectionSpot(placement.value) && !numberedSectionIds(segmentSlug).includes(placement.value)) {
    return { ok: false, error: "Choose the numbered section." };
  }
  const startDate = String(body.startDate ?? "").trim();
  const endDate = String(body.endDate ?? "").trim();
  if (!isIsoDate(startDate) || !isIsoDate(endDate) || endDate < startDate) {
    return { ok: false, error: "Enter a start and end date. The end date cannot be before the start." };
  }
  const status = String(body.status ?? "paid").trim();
  if (!isBookingStatus(status)) return { ok: false, error: "Choose a status." };
  const priceRaw = String(body.price ?? "").trim();
  let price: number | null = null;
  if (priceRaw) {
    const number = Number(priceRaw);
    if (!Number.isFinite(number) || number < 0 || number > 99999999) {
      return { ok: false, error: "Enter the price in dollars, or leave it blank." };
    }
    price = Math.round(number * 100) / 100;
  }
  const sponsorId = String(body.sponsorId ?? "").trim();
  if (sponsorId && !isUuid(sponsorId)) return { ok: false, error: "Choose a sponsor." };
  const creative = z
    .object({
      stripeSessionId: z.string().trim().max(200),
      headline: z.string().trim().max(120),
      body: z.string().trim().max(1200),
      cta: z.string().trim().max(80),
      url: optionalUrl,
      logo: optionalUrl,
    })
    .safeParse({
      stripeSessionId: String(body.stripeSessionId ?? ""),
      headline: String(body.headline ?? ""),
      body: String(body.body ?? ""),
      cta: String(body.cta ?? ""),
      url: String(body.url ?? ""),
      logo: String(body.logo ?? ""),
    });
  if (!creative.success) return { ok: false, error: "Check the creative text and links." };
  return {
    ok: true,
    value: {
      sponsorId: sponsorId || null,
      segment: segmentSlug,
      placement: placement.value as BookingPlacement,
      startDate,
      endDate,
      status,
      price,
      stripeSessionId: creative.data.stripeSessionId,
      headline: creative.data.headline,
      body: creative.data.body,
      cta: creative.data.cta,
      url: creative.data.url,
      logo: creative.data.logo,
      founding: flag(body.founding),
      exclusivityRequested: flag(body.exclusivityRequested ?? body.exclusivity),
    },
  };
}

export function parseInquiryInput(raw: unknown): { ok: true; value: InquiryInput } | { ok: false; error: string } {
  const body = asRecord(raw);
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(120),
      company: z.string().trim().min(1).max(160),
      email: z.string().trim().email().max(200),
      promote: z.string().trim().min(1).max(300),
      adCopy: z.string().trim().max(4000),
      budget: z.string().trim().max(80),
      message: z.string().trim().min(1).max(4000),
      segment: z.string().trim().max(40),
      placement: z.string().trim().max(40),
      status: z.enum(inquiryStatuses),
    })
    .safeParse({
      name: body.name,
      company: body.company,
      email: body.email,
      promote: body.promote,
      adCopy: body.adCopy ? String(body.adCopy) : "",
      budget: body.budget ? String(body.budget) : "",
      message: body.message,
      segment: body.segment ? String(body.segment) : "",
      placement: body.placement ? String(body.placement) : "",
      status: body.status ? String(body.status) : "new",
    });
  if (!parsed.success) {
    return { ok: false, error: "Check the name, company, email, what they want to promote, and message." };
  }
  if (parsed.data.segment && !getSegment(parsed.data.segment)) {
    return { ok: false, error: "Choose a section." };
  }
  const placement = storedPlacement(
    parsed.data.segment,
    parsed.data.placement,
    String(body.section ?? ""),
  );
  if (!placement.ok) return placement;
  if (
    placement.value &&
    isSectionSpot(placement.value) &&
    parsed.data.segment &&
    !numberedSectionIds(parsed.data.segment).includes(placement.value)
  ) {
    return { ok: false, error: "Choose the numbered section." };
  }
  const format = formatForPlacement(placement.value);
  if (parsed.data.adCopy && format) {
    const copyError = adCopyError(format, parsed.data.adCopy);
    if (copyError) return { ok: false, error: copyError };
  }
  return {
    ok: true,
    value: {
      ...parsed.data,
      email: parsed.data.email.toLowerCase(),
      placement: placement.value,
      promote: parsed.data.adCopy ? parsed.data.adCopy.slice(0, 300) : parsed.data.promote,
    },
  };
}

function storedPlacement(
  segment: string,
  placementRaw: string,
  sectionRaw: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const placement = placementRaw.trim();
  if (!placement) return { ok: true, value: "" };
  if (placement !== "section") {
    if (!isBookingPlacement(placement)) return { ok: false, error: "Choose a placement." };
    return { ok: true, value: placement };
  }
  const resolved = resolvePublicPlacement(placement, sectionRaw, numberedSectionIds(segment));
  if (!resolved.ok) return resolved;
  return { ok: true, value: resolved.value.placement };
}

async function writeSponsor(path: string, method: "POST" | "PATCH", input: SponsorInput): Promise<Sponsor> {
  const rows = await supabaseRest<SponsorRow[] | null>(path, {
    method,
    prefer: "return=representation",
    body: JSON.stringify(sponsorRow(input, new Date().toISOString())),
    failure,
  });
  const sponsor = mapSponsor(rowsOf(rows)[0] ?? {});
  if (!sponsor) throw new AppError("Sponsor storage did not return the saved row.", 502);
  return sponsor;
}

export async function createSponsor(input: SponsorInput): Promise<Sponsor> {
  return writeSponsor("sponsors", "POST", input);
}

export async function updateSponsor(id: string, input: SponsorInput): Promise<Sponsor> {
  if (!isUuid(id)) throw new AppError("That sponsor was not found.", 404);
  return writeSponsor(`sponsors?id=eq.${id}`, "PATCH", input);
}

export async function deleteSponsor(id: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("That sponsor was not found.", 404);
  await supabaseRest(`sponsors?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal", failure });
}

async function writeBooking(path: string, method: "POST" | "PATCH", input: BookingInput): Promise<Booking> {
  const rows = await supabaseRest<BookingRow[] | null>(path, {
    method,
    prefer: "return=representation",
    body: JSON.stringify(bookingRow(input, new Date().toISOString())),
    failure,
  });
  const booking = mapBooking(rowsOf(rows)[0] ?? {});
  if (!booking) throw new AppError("Sponsor storage did not return the saved booking.", 502);
  return booking;
}

export async function createBooking(input: BookingInput): Promise<Booking> {
  return writeBooking("bookings", "POST", input);
}

export async function updateBooking(id: string, input: BookingInput): Promise<Booking> {
  if (!isUuid(id)) throw new AppError("That booking was not found.", 404);
  return writeBooking(`bookings?id=eq.${id}`, "PATCH", input);
}

export async function deleteBooking(id: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("That booking was not found.", 404);
  await supabaseRest(`bookings?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal", failure });
}

function inquiryRow(input: InquiryInput, now: string): Record<string, unknown> {
  return {
    name: input.name,
    company: input.company,
    email: input.email,
    promote: input.promote,
    ad_copy: blank(input.adCopy),
    budget: blank(input.budget),
    message: input.message,
    segment: blank(input.segment),
    placement: blank(input.placement),
    status: input.status,
    updated_at: now,
  };
}

export async function createInquiry(input: InquiryInput): Promise<Inquiry> {
  const rows = await supabaseRest<InquiryRow[] | null>("inquiries", {
    method: "POST",
    prefer: "return=representation",
    body: JSON.stringify(inquiryRow(input, new Date().toISOString())),
    failure,
  });
  const inquiry = mapInquiry(rowsOf(rows)[0] ?? {});
  if (!inquiry) throw new AppError("Sponsor storage did not return the saved inquiry.", 502);
  return inquiry;
}

export async function updateInquiry(id: string, input: InquiryInput): Promise<Inquiry> {
  if (!isUuid(id)) throw new AppError("That inquiry was not found.", 404);
  const rows = await supabaseRest<InquiryRow[] | null>(`inquiries?id=eq.${id}`, {
    method: "PATCH",
    prefer: "return=representation",
    body: JSON.stringify(inquiryRow(input, new Date().toISOString())),
    failure,
  });
  const inquiry = mapInquiry(rowsOf(rows)[0] ?? {});
  if (!inquiry) throw new AppError("That inquiry was not found.", 404);
  return inquiry;
}

export async function deleteInquiry(id: string): Promise<void> {
  if (!isUuid(id)) throw new AppError("That inquiry was not found.", 404);
  await supabaseRest(`inquiries?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal", failure });
}

/** Store a public inquiry when Supabase is configured. Honeypot hits are ignored. */
export async function storePublicInquiry(input: {
  name: string;
  company: string;
  email: string;
  promote: string;
  adCopy: string;
  budget: string;
  message: string;
  segment: string;
  placement: string;
  honeypot: boolean;
}): Promise<void> {
  if (!supabaseConfigured() || input.honeypot) return;
  await createInquiry({
    name: input.name,
    company: input.company,
    email: input.email,
    promote: input.promote,
    adCopy: input.adCopy,
    budget: input.budget,
    message: input.message,
    segment: input.segment,
    placement: input.placement,
    status: "new",
  });
}

export async function upsertSponsorFromCheckout(input: {
  company: string;
  contact: string;
  email: string;
}): Promise<Sponsor | null> {
  const email = input.email.trim().toLowerCase();
  const company = input.company.trim();
  if (!email || !company || !email.includes("@")) return null;
  const rows = await supabaseRest<SponsorRow[] | null>("sponsors?on_conflict=email", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=representation",
    body: JSON.stringify({
      company: company.slice(0, 160),
      contact: (input.contact.trim() || company).slice(0, 120),
      email,
      updated_at: new Date().toISOString(),
    }),
    failure,
  });
  return mapSponsor(rowsOf(rows)[0] ?? {});
}

export function blocksCheckout(booking: Pick<Booking, "placement" | "status">): boolean {
  return isCheckoutPlacement(booking.placement) && isLiveBookingStatus(booking.status);
}

/** Insert legacy file rows that are not already stored. Empty input does nothing. */
export async function importReservationRows(rows: LegacyReservation[]): Promise<number> {
  if (!rows.length || !supabaseConfigured()) return 0;
  const existing = await listBookings();
  const seen = new Set(existing.flatMap((row) => [row.stripeSessionId, row.legacyId].filter(Boolean)));
  let inserted = 0;
  for (const row of rows) {
    if (seen.has(row.stripeSessionId) || seen.has(row.id)) continue;
    if (!isBookingPlacement(row.placement)) continue;
    const status = isBookingStatus(row.status) ? row.status : "paid";
    try {
      await supabaseRest("bookings", {
        method: "POST",
        prefer: "return=minimal",
        body: JSON.stringify({
          segment: row.segment,
          placement: row.placement,
          start_date: row.startDate,
          end_date: row.endDate,
          status,
          stripe_session_id: row.stripeSessionId || row.id,
          founding: row.founding,
          exclusivity_requested: row.exclusivityRequested,
          legacy_id: row.id,
          created_at: row.createdAt,
          updated_at: new Date().toISOString(),
        }),
        failure,
      });
      inserted += 1;
      seen.add(row.stripeSessionId);
      seen.add(row.id);
    } catch (error) {
      console.error(
        "A legacy sponsor booking was not copied.",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
  return inserted;
}

export async function issueWithLiveSponsors<T extends Issue>(issue: T): Promise<T> {
  if (!supabaseConfigured()) return issue;
  try {
    const bookings = await listBookings();
    return applyBookingsToIssue(issue, bookings);
  } catch (error) {
    console.error("Live sponsors were not loaded.", error instanceof Error ? error.message : "unknown");
    return issue;
  }
}

export const bookingStatusList = bookingStatuses;
export const inquiryStatusList = inquiryStatuses;
