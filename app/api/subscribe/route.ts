import { NextResponse } from "next/server";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { startDoubleOptIn } from "@/lib/subscribe";
import { turnstileTokenFrom, verifyTurnstile } from "@/lib/turnstile";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const ip = requestIp(request);
  if (!rateLimit(`${ip}:subscribe`)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: {
    email?: string;
    segment?: string;
    firstName?: string;
    company_website?: string;
    excludedSections?: unknown;
    suggestion?: unknown;
    source?: unknown;
    turnstileToken?: unknown;
    "cf-turnstile-response"?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON with an email and a section." }, { status: 400 });
  }

  if ((body.company_website ?? "").trim()) {
    return NextResponse.json({
      ok: true,
      status: "accepted",
      message: "Check your inbox for a confirmation email. You are not on the list until you click it.",
    });
  }

  const verified = await verifyTurnstile({
    token: turnstileTokenFrom(body),
    action: "signup",
    remoteip: ip,
  });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const result = await startDoubleOptIn({
    email: body.email,
    segment: body.segment,
    firstName: body.firstName,
    honeypot: body.company_website,
    excludedSections: body.excludedSections,
    suggestion: body.suggestion,
    source: body.source,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  const message =
    result.status === "already_subscribed"
      ? "That address is already confirmed for this section."
      : "Check your inbox for a confirmation email. You are not on the list until you click it.";
  return NextResponse.json({ ok: true, status: result.status, message });
}
