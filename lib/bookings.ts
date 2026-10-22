import fs from "fs";
import path from "path";
import { z } from "zod";
import { rangesOverlap } from "@/lib/dates";
import { githubConfigured, readRepoFile, writeRepoFile } from "@/lib/github";
import { placements, type Placement } from "@/lib/rate-card";
import type { Issue } from "@/lib/schema";
import { isCheckoutPlacement, isLiveBookingStatus } from "@/lib/sponsor-placements";
import {
  blocksCheckout,
  createBooking,
  importReservationRows,
  issueWithLiveSponsors,
  listBookings,
  upsertSponsorFromCheckout,
  type Booking,
} from "@/lib/sponsor-store";
import { supabaseConfigured } from "@/lib/supabase-admin";

const FILE = "content/bookings.json";

export const reservationSchema = z.object({
  id: z.string().min(1),
  segment: z.string().min(1),
  placement: z.enum(placements),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  founding: z.boolean(),
  exclusivityRequested: z.boolean(),
  status: z.literal("paid"),
  createdAt: z.string().min(1),
  stripeSessionId: z.string().min(1),
});

export type Reservation = z.infer<typeof reservationSchema>;

export type SessionLike = {
  id: string;
  created?: number;
  metadata?: Record<string, string> | null;
  custom_fields?: Array<{
    key: string;
    text?: { value?: string | null } | null;
    dropdown?: { value?: string | null } | null;
  }> | null;
};

export function parseReservations(text: string): Reservation[] {
  const parsed = JSON.parse(text) as unknown;
  return z.array(reservationSchema).parse(parsed);
}

export function localBookingsPath(): string {
  return path.join(process.cwd(), FILE);
}

export function readLocalReservations(): Reservation[] {
  const file = localBookingsPath();
  if (!fs.existsSync(file)) return [];
  return parseReservations(fs.readFileSync(file, "utf8"));
}

/** File or GitHub copy. Supabase is the live inventory once it is configured. */
export async function loadLegacyReservations(): Promise<Reservation[]> {
  if (githubConfigured()) {
    try {
      const remote = await readRepoFile(FILE);
      if (remote) return parseReservations(remote.text);
    } catch {
      // Use the copy shipped with this deploy if GitHub is briefly unavailable.
    }
  }
  return readLocalReservations();
}

let legacyImport: Promise<void> | null = null;

export function resetLegacyImportForTests(): void {
  legacyImport = null;
}

/** Copy content/bookings.json into Supabase once per process. An empty file is a no-op. */
export function importLegacyBookings(): Promise<void> {
  if (!supabaseConfigured()) return Promise.resolve();
  if (!legacyImport) {
    legacyImport = loadLegacyReservations()
      .then((rows) => importReservationRows(rows))
      .then(() => undefined)
      .catch((error) => {
        legacyImport = null;
        throw error;
      });
  }
  return legacyImport;
}

function reservationFromBooking(booking: Booking): Reservation | null {
  if (!blocksCheckout(booking) || !isCheckoutPlacement(booking.placement) || !isLiveBookingStatus(booking.status)) {
    return null;
  }
  return {
    id: booking.stripeSessionId || booking.id,
    stripeSessionId: booking.stripeSessionId || booking.id,
    segment: booking.segment,
    placement: booking.placement,
    startDate: booking.startDate,
    endDate: booking.endDate,
    founding: booking.founding,
    exclusivityRequested: booking.exclusivityRequested,
    status: "paid",
    createdAt: booking.createdAt || new Date(0).toISOString(),
  };
}

/** Copy legacy rows, then overlay the bookings that cover this issue. */
export async function issueForDelivery<T extends Issue>(issue: T): Promise<T> {
  if (supabaseConfigured()) {
    try {
      await importLegacyBookings();
    } catch (error) {
      console.error(
        "Legacy sponsor bookings were not copied.",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
  return issueWithLiveSponsors(issue);
}

export async function loadReservations(): Promise<Reservation[]> {
  if (supabaseConfigured()) {
    try {
      await importLegacyBookings();
      const bookings = await listBookings();
      return bookings.flatMap((booking) => {
        const reservation = reservationFromBooking(booking);
        return reservation ? [reservation] : [];
      });
    } catch (error) {
      console.error(
        "Sponsor bookings could not be read from Supabase. Using the legacy file.",
        error instanceof Error ? error.message : "unknown",
      );
    }
  }
  return loadLegacyReservations();
}

export async function saveReservations(
  rows: Reservation[],
): Promise<"github" | "local"> {
  const text = `${JSON.stringify(rows, null, 2)}\n`;
  if (githubConfigured()) {
    await writeRepoFile(FILE, text, "Record a sponsor reservation");
    return "github";
  }
  fs.writeFileSync(localBookingsPath(), text);
  return "local";
}

export function findConflict(
  existing: Reservation[],
  candidate: {
    segment: string;
    placement: string;
    startDate: string;
    endDate: string;
  },
): Reservation | undefined {
  return existing.find(
    (row) =>
      row.segment === candidate.segment &&
      row.placement === candidate.placement &&
      rangesOverlap(row.startDate, row.endDate, candidate.startDate, candidate.endDate),
  );
}

export function publicReservations(rows: Reservation[]): Array<{
  segment: string;
  placement: Placement;
  startDate: string;
  endDate: string;
}> {
  return rows.map((row) => ({
    segment: row.segment,
    placement: row.placement,
    startDate: row.startDate,
    endDate: row.endDate,
  }));
}

function customField(session: SessionLike, key: string): string | undefined {
  const field = session.custom_fields?.find((item) => item.key === key);
  const value = field?.text?.value || field?.dropdown?.value || "";
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function reservationFromSession(session: SessionLike): Reservation | null {
  const meta = session.metadata ?? {};
  const segment = meta.segment || customField(session, "segment");
  const placement = meta.placement || customField(session, "placement");
  const startDate =
    meta.week_start ||
    meta.start_date ||
    customField(session, "preferred_week") ||
    customField(session, "week_start");
  const endDate = meta.end_date || startDate;
  if (!segment || !placement || !startDate || !endDate) return null;
  if (!placements.includes(placement as Placement)) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return null;
  }

  const createdSeconds = session.created ?? Math.floor(Date.now() / 1000);
  return {
    id: session.id,
    stripeSessionId: session.id,
    segment,
    placement: placement as Placement,
    startDate,
    endDate,
    founding: meta.founding === "true",
    exclusivityRequested: meta.exclusivity === "true",
    status: "paid",
    createdAt: new Date(createdSeconds * 1000).toISOString(),
  };
}

export type PaidReservationExtras = {
  price?: number | null;
  company?: string | null;
  contact?: string | null;
  email?: string | null;
  creativeUrl?: string | null;
};

export async function recordPaidReservation(
  reservation: Reservation,
  extras: PaidReservationExtras = {},
): Promise<{
  duplicate: boolean;
  conflict: Reservation | null;
  stored: "supabase" | "github" | "local" | "unstored";
}> {
  if (supabaseConfigured()) {
    try {
      await importLegacyBookings();
      const existing = await loadReservations();
      if (existing.some((row) => row.id === reservation.id || row.stripeSessionId === reservation.stripeSessionId)) {
        return { duplicate: true, conflict: null, stored: "supabase" };
      }
      const conflict =
        reservation.placement === "featured" ? null : (findConflict(existing, reservation) ?? null);
      const sponsor = await upsertSponsorFromCheckout({
        company: extras.company ?? "",
        contact: extras.contact ?? "",
        email: extras.email ?? "",
      });
      await createBooking({
        sponsorId: sponsor?.id ?? null,
        segment: reservation.segment,
        placement: reservation.placement,
        startDate: reservation.startDate,
        endDate: reservation.endDate,
        status: "paid",
        price: extras.price ?? null,
        stripeSessionId: reservation.stripeSessionId,
        headline: (extras.company ?? "").trim().slice(0, 120),
        body: "",
        cta: "",
        url: (extras.creativeUrl ?? "").trim().slice(0, 500),
        logo: "",
        founding: reservation.founding,
        exclusivityRequested: reservation.exclusivityRequested,
      });
      return { duplicate: false, conflict, stored: "supabase" };
    } catch {
      return { duplicate: false, conflict: null, stored: "unstored" };
    }
  }

  const existing = await loadLegacyReservations();
  if (existing.some((row) => row.id === reservation.id)) {
    return { duplicate: true, conflict: null, stored: "local" };
  }
  const conflict =
    reservation.placement === "featured" ? null : (findConflict(existing, reservation) ?? null);
  try {
    const stored = await saveReservations([...existing, reservation]);
    return { duplicate: false, conflict, stored };
  } catch {
    return { duplicate: false, conflict, stored: "unstored" };
  }
}
