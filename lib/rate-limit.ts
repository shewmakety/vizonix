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

/**
 * Client IP for rate limiting. Vercel sets x-real-ip itself, so prefer it. x-forwarded-for can carry
 * client-supplied entries, so it is only used off Vercel (local dev and tests).
 */
export function clientIpFromHeaders(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 80);
  if (!process.env.VERCEL) {
    const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  return "local";
}

export function requestIp(request: Request): string {
  return clientIpFromHeaders(request.headers);
}
