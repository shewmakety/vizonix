import { NextResponse } from "next/server";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { SEGMENT_COOKIE, segmentCookieAttributes } from "@/lib/segment-memory";
import { confirmSubscription } from "@/lib/subscribe";
import { turnstileTokenFrom, verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = requestIp(request);
  if (!rateLimit(`${ip}:confirm`)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: { token?: string; turnstileToken?: unknown; "cf-turnstile-response"?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Missing confirmation token." }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "Missing confirmation token." }, { status: 400 });
  }
  const verified = await verifyTurnstile({
    token: turnstileTokenFrom(body),
    action: "confirm",
    remoteip: ip,
  });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }
  const source = request.headers.get("referer")?.trim() || undefined;
  const result = await confirmSubscription(body.token, source ? { source } : undefined);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const response = NextResponse.json({ ok: true, message: result.message });
  response.cookies.set(SEGMENT_COOKIE, result.segment, segmentCookieAttributes());
  return response;
}
