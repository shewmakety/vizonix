import { adminError, adminJson, enforceTurnstile, isNextResponse, readJsonBody, requireAdminRequest } from "@/lib/admin-http";
import { createBooking, parseBookingInput } from "@/lib/sponsor-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-booking");
  if (turnstile) return turnstile;
  const parsed = parseBookingInput(body);
  if (!parsed.ok) return adminJson({ error: parsed.error }, 400);
  try {
    const booking = await createBooking(parsed.value);
    return adminJson({ ok: true, id: booking.id });
  } catch (error) {
    return adminError(error, "That Stripe session is already stored.");
  }
}
