import { adminError, adminJson, enforceTurnstile, isNextResponse, readJsonBody, requireAdminRequest } from "@/lib/admin-http";
import { deleteSponsor, parseSponsorInput, updateSponsor } from "@/lib/sponsor-store";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-sponsor");
  if (turnstile) return turnstile;
  const parsed = parseSponsorInput(body);
  if (!parsed.ok) return adminJson({ error: parsed.error }, 400);
  try {
    const { id } = await params;
    const sponsor = await updateSponsor(id, parsed.value);
    return adminJson({ ok: true, id: sponsor.id });
  } catch (error) {
    return adminError(error, "A sponsor with that email already exists.");
  }
}

export async function DELETE(request: Request, { params }: Props) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-sponsor");
  if (turnstile) return turnstile;
  try {
    const { id } = await params;
    await deleteSponsor(id);
    return adminJson({ ok: true });
  } catch (error) {
    return adminError(error);
  }
}
