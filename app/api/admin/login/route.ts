import {
  ADMIN_COOKIE,
  adminConfigured,
  adminCookieOptions,
  adminPasswordMatches,
  createAdminSession,
  requestIsSecure,
  sameOrigin,
} from "@/lib/admin-session";
import { adminJson, enforceTurnstile, readJsonBody, isNextResponse } from "@/lib/admin-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return adminJson({ error: "Sign-in failed." }, 403);
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
