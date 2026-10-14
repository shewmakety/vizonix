import { createHash, timingSafeEqual } from "crypto";

export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!header || !secret) return false;
  const match = /^Bearer\s+(\S+)\s*$/.exec(header);
  if (!match) return false;
  const given = createHash("sha256").update(match[1]).digest();
  const expected = createHash("sha256").update(secret).digest();
  return timingSafeEqual(given, expected);
}
