import { NextResponse } from "next/server";
import { errorMessage } from "@/lib/errors";
import { notifyOps } from "@/lib/notify";
import { site } from "@/lib/site";
import { getSegment } from "@/lib/segments";
import { allowInquiry, inquiryClientKey, parseInquiry } from "@/lib/sponsor-inquiry";
import { placementLabel } from "@/lib/sponsor-labels";
import { formatForPlacement, sponsorSlotSpec } from "@/lib/sponsor-slots";
import { storePublicInquiry } from "@/lib/sponsor-store";
import { turnstileTokenFrom, verifyTurnstile } from "@/lib/turnstile";

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

  const verified = await verifyTurnstile({
    token: turnstileTokenFrom(raw as object),
    action: "inquiry",
    remoteip: ip,
  });
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.status });
  }

  const inquiry = parsed.value;
  try {
    await storePublicInquiry(inquiry);
  } catch (error) {
    console.error("Sponsor inquiry was not stored.", errorMessage(error));
  }
  const format = formatForPlacement(inquiry.placement);
  const placementName =
    format === "section"
      ? (sponsorSlotSpec("section")?.name ?? "Section sponsor")
      : placementLabel(inquiry.segment, inquiry.placement);
  const sent = await notifyOps(
    `Sponsor inquiry from ${inquiry.company.replace(/[\r\n]/g, " ").slice(0, 80)}`,
    [
      `Name: ${inquiry.name}`,
      `Company: ${inquiry.company}`,
      `Email: ${inquiry.email}`,
      `Ad copy: ${inquiry.adCopy}`,
      `Budget: ${inquiry.budget || "Not specified"}`,
      `Section: ${getSegment(inquiry.segment)?.name ?? inquiry.segment}`,
      `Placement: ${placementName}`,
      ...(format === "section"
        ? [`Sponsored section: ${placementLabel(inquiry.segment, inquiry.placement)}`]
        : []),
      "",
      inquiry.message,
    ].join("\n"),
    { replyTo: inquiry.email },
  );
  if (!sent) {
    return NextResponse.json(
      { error: `The inquiry could not be sent. Email ${site.email} instead.` },
      { status: 503 },
    );
  }
  return NextResponse.json({ ok: true });
}
