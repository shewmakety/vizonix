import { NextResponse } from "next/server";
import { notifyOps } from "@/lib/notify";
import { site } from "@/lib/site";
import { allowInquiry, inquiryClientKey, parseInquiry } from "@/lib/sponsor-inquiry";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Send the inquiry as JSON." }, { status: 400 });
  }

  const parsed = parseInquiry(raw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  if (parsed.value.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const ip = inquiryClientKey(request.headers.get("x-forwarded-for"));
  if (!allowInquiry(ip)) {
    return NextResponse.json(
      { error: "Too many notes from this network. Try again later." },
      { status: 429 },
    );
  }

  const inquiry = parsed.value;
  const sent = await notifyOps(
    `Sponsor inquiry from ${inquiry.company.replace(/[\r\n]/g, " ").slice(0, 80)}`,
    [
      `Name: ${inquiry.name}`,
      `Company: ${inquiry.company}`,
      `Email: ${inquiry.email}`,
      `Promote: ${inquiry.promote}`,
      `Budget: ${inquiry.budget || "Not specified"}`,
      "",
      inquiry.message,
    ].join("\n"),
    { replyTo: inquiry.email },
  );
  if (!sent) {
    return NextResponse.json(
      { error: `The inquiry could not be sent. Email ${site.emailHello} instead.` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}
