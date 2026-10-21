type Bucket = number[];

const buckets = new Map<string, Bucket>();

export const READER_WRITE_LIMIT = 8;
export const READER_WRITE_WINDOW_MS = 10 * 60 * 1000;
export const READER_IP_LIMIT = 30;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfter: number } {
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    const retryAfter = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
    return { ok: false, retryAfter };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true };
}

export function resetRateLimits(): void {
  buckets.clear();
}

export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded.slice(0, 80);
  return "local";
}
