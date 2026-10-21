import { createHmac, timingSafeEqual } from "crypto";
import type { PendingChoices } from "@/lib/reader-topics";

export type TokenPurpose = "confirm" | "unsubscribe" | "preferences";

export type TokenPayload = {
  email: string;
  segment: string;
  purpose: TokenPurpose;
  exp: number;
  /** Signup choices held until the confirm link is used. */
  pending?: PendingChoices;
};

const PURPOSE_TTL_MS: Record<TokenPurpose, number> = {
  confirm: 1000 * 60 * 60 * 48,
  unsubscribe: 1000 * 60 * 60 * 24 * 180,
  preferences: 1000 * 60 * 60 * 24 * 180,
};

function readPending(value: unknown): PendingChoices | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as { excluded?: unknown; suggestion?: unknown; source?: unknown };
  if (!Array.isArray(record.excluded) || !record.excluded.every((item) => typeof item === "string")) {
    return undefined;
  }
  const pending: PendingChoices = { excluded: record.excluded };
  if (typeof record.suggestion === "string" && record.suggestion.trim()) pending.suggestion = record.suggestion;
  if (typeof record.source === "string" && record.source.trim()) pending.source = record.source;
  return pending;
}

export function tokenSecret(): string | undefined {
  return process.env.TOKEN_SECRET || undefined;
}

export function signToken(
  input: { email: string; segment: string; purpose: TokenPurpose; pending?: PendingChoices },
  secret: string,
  now = Date.now(),
): string {
  const payload: TokenPayload = {
    email: input.email.trim().toLowerCase(),
    segment: input.segment,
    purpose: input.purpose,
    exp: now + PURPOSE_TTL_MS[input.purpose],
  };
  if (input.purpose === "confirm" && input.pending) payload.pending = input.pending;
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
    const pending = readPending(payload.pending);
    if (pending) payload.pending = pending;
    else delete payload.pending;
    return payload;
  } catch {
    return null;
  }
}
