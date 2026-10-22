import { createHash, createHmac, timingSafeEqual } from "crypto";

export const ADMIN_COOKIE = "vizonix_admin";

const sessionMs = 12 * 60 * 60 * 1000;

function password(): string {
  return process.env.ADMIN_PASSWORD ?? "";
}

export function adminConfigured(): boolean {
  return password().trim().length > 0;
}

export function adminPasswordMatches(given: unknown): boolean {
  const expected = password();
  if (!expected || typeof given !== "string" || given.length === 0) return false;
  const actual = createHash("sha256").update(given).digest();
  const wanted = createHash("sha256").update(expected).digest();
  return timingSafeEqual(actual, wanted);
}

function sign(body: string): string {
  return createHmac("sha256", password()).update(body).digest("base64url");
}

export function createAdminSession(now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ sub: "ty", exp: now + sessionMs }), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifyAdminSession(token: string | undefined | null, now = Date.now()): boolean {
  if (!adminConfigured() || !token) return false;
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return false;
  const body = token.slice(0, splitAt);
  const mac = token.slice(splitAt + 1);
  const expected = sign(body);
  const actual = Buffer.from(mac);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length || !timingSafeEqual(actual, wanted)) return false;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as { sub?: unknown; exp?: unknown };
    return payload.sub === "ty" && typeof payload.exp === "number" && payload.exp > now;
  } catch {
    return false;
  }
}

export function adminTokenFromRequest(request: Request): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== ADMIN_COOKIE) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return undefined;
}

export function requestIsSecure(request: Request): boolean {
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim().toLowerCase();
  if (proto) return proto === "https";
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function adminCookieOptions(secure: boolean): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: sessionMs / 1000,
  };
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
