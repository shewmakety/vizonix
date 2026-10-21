import { NextResponse } from "next/server";
import { startDoubleOptIn } from "@/lib/subscribe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: {
    email?: string;
    segment?: string;
    firstName?: string;
    company_website?: string;
    includedSections?: unknown;
    suggestion?: unknown;
    source?: unknown;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON with an email and a section." }, { status: 400 });
  }

  const result = await startDoubleOptIn({
    email: body.email,
    segment: body.segment,
    firstName: body.firstName,
    honeypot: body.company_website,
    includedSections: body.includedSections,
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
