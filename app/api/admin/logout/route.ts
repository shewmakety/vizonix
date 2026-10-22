import { ADMIN_COOKIE, adminCookieOptions, requestIsSecure } from "@/lib/admin-session";
import { adminJson, enforceTurnstile, readJsonBody, isNextResponse, requireAdminRequest } from "@/lib/admin-http";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-logout");
  if (turnstile) return turnstile;
  const response = adminJson({ ok: true });
  response.cookies.set(ADMIN_COOKIE, "", { ...adminCookieOptions(requestIsSecure(request)), maxAge: 0 });
  return response;
}
