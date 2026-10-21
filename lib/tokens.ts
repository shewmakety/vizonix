import { createHmac, timingSafeEqual } from "crypto";

export type TokenPurpose = "confirm" | "unsubscribe" | "preferences";

export type TokenPayload = {
  email: string;
  segment: string;
  purpose: TokenPurpose;
  exp: number;
  /** Topics to leave out. Present on a confirm link after the signup picker, even when empty. */
  excluded?: string[];
  suggestion?: string;
  source?: string;
};

const PURPOSE_TTL_MS: Record<TokenPurpose, number> = {
  confirm: 1000 * 60 * 60 * 48,
  unsubscribe: 1000 * 60 * 60 * 24 * 180,
  preferences: 1000 * 60 * 60 * 24 * 180,
};

export function tokenSecret(): string | undefined {
  return process.env.TOKEN_SECRET || undefined;
}

export function signToken(
  input: {
    email: string;
    segment: string;
    purpose: TokenPurpose;
    excluded?: string[];
    suggestion?: string;
    source?: string;
  },
  secret: string,
  now = Date.now(),
): string {
  const payload: TokenPayload = {
    email: input.email.trim().toLowerCase(),
    segment: input.segment,
    purpose: input.purpose,
    exp: now + PURPOSE_TTL_MS[input.purpose],
  };
  if (Array.isArray(input.excluded)) payload.excluded = input.excluded;
  if (input.suggestion) payload.suggestion = input.suggestion;
  if (input.source) payload.source = input.source;
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function verifyToken(
  token: string,
  secret: string,
  purpose: TokenPurpose,
  now = Date.now(),
): TokenPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, signature] = parts;
  if (!body || !signature) return null;

  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
    if (payload.purpose !== purpose) return null;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (!payload.email || !payload.segment) return null;
    if (payload.excluded !== undefined) {
      if (!Array.isArray(payload.excluded) || payload.excluded.some((item) => typeof item !== "string")) {
        delete payload.excluded;
      }
    }
    if (payload.suggestion !== undefined && typeof payload.suggestion !== "string") delete payload.suggestion;
    if (payload.source !== undefined && typeof payload.source !== "string") delete payload.source;
    return payload;
  } catch {
    return null;
  }
}
