import { adminError, adminJson, enforceTurnstile, isNextResponse, readJsonBody, requireAdminRequest } from "@/lib/admin-http";
import { createInquiry, parseInquiryInput } from "@/lib/sponsor-store";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const denied = requireAdminRequest(request);
  if (denied) return denied;
  const body = await readJsonBody(request);
  if (isNextResponse(body)) return body;
  const turnstile = await enforceTurnstile(request, body, "admin-inquiry");
  if (turnstile) return turnstile;
  const parsed = parseInquiryInput(body);
  if (!parsed.ok) return adminJson({ error: parsed.error }, 400);
  try {
    const inquiry = await createInquiry(parsed.value);
    return adminJson({ ok: true, id: inquiry.id });
  } catch (error) {
    return adminError(error);
  }
}
