import { TURNSTILE_TEST_TOKEN, type TurnstileAction } from "@/lib/turnstile-public";

export type { TurnstileAction };

/** Cloudflare's documented always-pass secret. Production rejects it. */
export const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

export type TurnstileResult = { ok: true } | { ok: false; status: number; error: string };

const failure: TurnstileResult = { ok: false, status: 403, error: "Verification failed. Try again." };
const unavailable: TurnstileResult = { ok: false, status: 503, error: "Verification is not available right now." };

function productionDeployment(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/** Real secret, or the test secret outside production. Production with no real secret fails closed. */
export function turnstileSecret(): string | undefined {
  const configured = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (productionDeployment()) {
    if (!configured) {
      console.error("TURNSTILE_SECRET_KEY is not set. Production form submissions are blocked.");
      return undefined;
    }
    if (configured === TURNSTILE_TEST_SECRET) {
      console.error("TURNSTILE_SECRET_KEY is a Cloudflare test secret. Production form submissions are blocked.");
      return undefined;
    }
    if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()) {
      console.error("NEXT_PUBLIC_TURNSTILE_SITE_KEY is not set. Production form submissions are blocked.");
      return undefined;
    }
    return configured;
  }
  return configured || TURNSTILE_TEST_SECRET;
}

function allowedHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (!host) return false;
  const allowed = new Set<string>();
  const site = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (site) {
    try {
      const name = new URL(site).hostname.toLowerCase();
      allowed.add(name);
      if (name.startsWith("www.")) allowed.add(name.slice(4));
      else allowed.add(`www.${name}`);
    } catch {
      // Ignore a bad site URL and keep the other hostnames.
    }
  }
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL?.trim()) {
    allowed.add(process.env.VERCEL_URL.trim().toLowerCase());
  }
  if (!productionDeployment()) {
    allowed.add("localhost");
    allowed.add("127.0.0.1");
  }
  return allowed.has(host);
}

type Siteverify = {
  success?: boolean;
  action?: string;
  hostname?: string;
};

/**
 * Server-side siteverify. The documented test secret accepts only the documented dummy token
 * and does not call Cloudflare, so unit tests stay offline. A real secret must succeed, match
 * the action, and come from this site's hostname.
 */
export async function verifyTurnstile(input: {
  token: unknown;
  action: TurnstileAction;
  remoteip?: string;
}): Promise<TurnstileResult> {
  const secret = turnstileSecret();
  if (!secret) return unavailable;

  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (!token || token.length > 2048) return failure;

  if (secret === TURNSTILE_TEST_SECRET) {
    return token === TURNSTILE_TEST_TOKEN ? { ok: true } : failure;
  }

  let result: Siteverify;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body: new URLSearchParams({
        secret,
        response: token,
        ...(input.remoteip && input.remoteip !== "local" ? { remoteip: input.remoteip } : {}),
      }),
    });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    result = (await response.json()) as Siteverify;
  } catch (error) {
    console.error("Turnstile siteverify failed.", error instanceof Error ? error.message : "unknown");
    return failure;
  }

  if (result.success !== true || result.action !== input.action || !allowedHostname(result.hostname ?? "")) {
    return failure;
  }
  return { ok: true };
}

export function turnstileTokenFrom(body: object): unknown {
  const record = body as { turnstileToken?: unknown; "cf-turnstile-response"?: unknown };
  return record.turnstileToken ?? record["cf-turnstile-response"];
}
