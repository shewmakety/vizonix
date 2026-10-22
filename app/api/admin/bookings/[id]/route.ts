import { adminError, adminJson, enforceTurnstile, isNextResponse, readJsonBody, requireAdminRequest } from "@/lib/admin-http";
import { deleteBooking, parseBookingInput, updateBooking } from "@/lib/sponsor-store";

export const runtime = "nodejs";

type Props = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Props) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-booking");
  if (turnstile) return turnstile;
  const parsed = parseBookingInput(body);
  if (!parsed.ok) return adminJson({ error: parsed.error }, 400);
  try {
    const { id } = await params;
    const booking = await updateBooking(id, parsed.value);
    return adminJson({ ok: true, id: booking.id });
  } catch (error) {
    return adminError(error, "That Stripe session is already stored.");
  }
}

export async function DELETE(request: Request, { params }: Props) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-booking");
  if (turnstile) return turnstile;
  try {
    const { id } = await params;
    await deleteBooking(id);
    return adminJson({ ok: true });
  } catch (error) {
    return adminError(error);
  }
}
