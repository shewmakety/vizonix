import {
  ADMIN_COOKIE,
  adminConfigured,
  adminCookieOptions,
  adminPasswordMatches,
  createAdminSession,
  requestIsSecure,
  sameOrigin,
} from "@/lib/admin-session";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { adminJson, enforceTurnstile, readJsonBody, isNextResponse } from "@/lib/admin-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return adminJson({ error: "Sign-in failed." }, 403);
  if (!rateLimit(`${requestIp(request)}:admin-login`, 5, 15 * 60 * 1000)) {
    return adminJson({ error: "Too many sign-in attempts. Try again later." }, 429);
  }
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-login");
  if (turnstile) return turnstile;
  if (!adminConfigured()) return adminJson({ error: "Admin sign-in is not configured." }, 503);
  if (!adminPasswordMatches(body.password)) return adminJson({ error: "Sign-in failed." }, 401);
  const response = adminJson({ ok: true });
  response.cookies.set(ADMIN_COOKIE, createAdminSession(), adminCookieOptions(requestIsSecure(request)));
  return response;
}
