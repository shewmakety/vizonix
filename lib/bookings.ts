import fs from "fs";
import path from "path";
import { z } from "zod";
import { rangesOverlap } from "@/lib/dates";
import { githubConfigured, readRepoFile, writeRepoFile } from "@/lib/github";
import { placements, type Placement } from "@/lib/rate-card";

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

export async function loadReservations(): Promise<Reservation[]> {
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

export async function recordPaidReservation(reservation: Reservation): Promise<{
  duplicate: boolean;
  conflict: Reservation | null;
  stored: "github" | "local" | "unstored";
}> {
  const existing = await loadReservations();
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
