import { adminError, adminJson, enforceTurnstile, isNextResponse, readJsonBody, requireAdminRequest } from "@/lib/admin-http";
import { createSponsor, parseSponsorInput } from "@/lib/sponsor-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-sponsor");
  if (turnstile) return turnstile;
  const parsed = parseSponsorInput(body);
  if (!parsed.ok) return adminJson({ error: parsed.error }, 400);
  try {
    const sponsor = await createSponsor(parsed.value);
    return adminJson({ ok: true, id: sponsor.id });
  } catch (error) {
    return adminError(error, "A sponsor with that email already exists.");
  }
}
