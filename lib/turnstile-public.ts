/** Cloudflare's documented always-pass widget. Safe for tests and preview when a real key is unset. */
export const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";

/** Token the always-pass test widget returns. Siteverify accepts it with the matching test secret. */
export const TURNSTILE_TEST_TOKEN = "XXXX.DUMMY.TOKEN.XXXX";

/** Public site key. Production builds should set NEXT_PUBLIC_TURNSTILE_SITE_KEY. */
export function publicTurnstileSiteKey(): string {
  const configured = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  return configured || TURNSTILE_TEST_SITE_KEY;
}
