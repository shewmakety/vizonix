const buckets = new Map<string, number[]>();

export function resetRateLimits(): void {
  buckets.clear();
}

/** True when the call is allowed. Fixed window, in memory, per server instance. */
export function rateLimit(key: string, limit = 10, windowMs = 10 * 60 * 1000, now = Date.now()): boolean {
  const recent = (buckets.get(key) ?? []).filter((stamp) => now - stamp < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }
  recent.push(now);
  buckets.set(key, recent);
  return true;
}

export function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  if (first) return first.slice(0, 80);
  return request.headers.get("x-real-ip")?.trim().slice(0, 80) || "local";
}
