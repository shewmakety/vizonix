const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function weekdayOf(isoDate: string): number {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function isMonday(isoDate: string): boolean {
  return isIsoDate(isoDate) && weekdayOf(isoDate) === 1;
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function todayInNewYork(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** Calendar day at the start of an ISO date or timestamp, with no timezone shift. */
export function formatIsoDay(value: string): string {
  const day = value.slice(0, 10);
  if (!isIsoDate(day)) return value;
  return formatLongDate(day);
}

export function formatLongDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

/**
 * Noon UTC on a date-only day.
 * `new Date("YYYY-MM-DD")` is UTC midnight, which is the previous evening in America/New_York.
 * Noon stays on the same calendar date in UTC and in New York.
 */
export function calendarInstant(isoDate: string): Date {
  return new Date(`${isoDate}T12:00:00.000Z`);
}

/** The issue's date-only field, as that calendar day. publishedAt is not the label. */
export function formatIssueDate(issue: { date: string }): string {
  return formatLongDate(issue.date);
}

/** Open Graph footer. The calendar date stays in front of the preheader. */
export function issueDateLine(issue: { date: string; preheader?: string }): string {
  const label = formatIssueDate(issue);
  return issue.preheader ? `${label}. ${issue.preheader}` : label;
}

/** Never return an instant later than `now`. An invalid date falls back to `now`. */
export function clampInstant(instant: Date, now = new Date()): Date {
  if (Number.isNaN(instant.getTime()) || instant.getTime() > now.getTime()) return new Date(now.getTime());
  return instant;
}

/**
 * When an issue is dated for its send day, `publishedAt` is the real publish time.
 * A missing timestamp falls back to 07:00 America/New_York on that send day, then clamps.
 */
export function issuePublishedInstant(
  issue: { date: string; publishedAt?: string },
  now = new Date(),
): Date {
  const parsed = issue.publishedAt ? new Date(issue.publishedAt) : new Date(`${issue.date}T11:00:00.000Z`);
  return clampInstant(parsed, now);
}

export function formatPublishedInstant(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(instant);
}

/** Clock time for owner alerts. America/New_York, including the zone abbreviation. */
export function formatNewYorkTimestamp(instant: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(instant);
}

export function rangesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
