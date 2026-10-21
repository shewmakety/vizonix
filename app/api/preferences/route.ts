import { NextResponse } from "next/server";
import { AppError } from "@/lib/errors";
import { saveSubscriberPrefs } from "@/lib/prefs";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { parseExcluded } from "@/lib/reader-sections";
import { getSegment } from "@/lib/segments";
import { tokenSecret, verifyToken } from "@/lib/tokens";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!rateLimit(`${requestIp(request)}:preferences`)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let body: { token?: unknown; excludedSections?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON with a token and a topic list." }, { status: 400 });
  }
  if (typeof body.token !== "string" || !body.token.trim()) {
    return NextResponse.json({ error: "Missing preferences token." }, { status: 400 });
  }
  if (!Array.isArray(body.excludedSections)) {
    return NextResponse.json({ error: "Send the topics to leave out." }, { status: 400 });
  }

  const secret = tokenSecret();
  if (!secret) return NextResponse.json({ error: "Preferences are not configured." }, { status: 503 });
  const payload = verifyToken(body.token, secret, "preferences");
  if (!payload) {
    return NextResponse.json({ error: "This preferences link is invalid or expired." }, { status: 400 });
  }
  const segment = getSegment(payload.segment);
  if (!segment || segment.status !== "active") {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }

  const parsed = parseExcluded(body.excludedSections.map((value) => String(value)));
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    await saveSubscriberPrefs({
      email: payload.email,
      segment: segment.slug,
      excluded: parsed.excluded,
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 502;
    const message = error instanceof AppError ? error.message : "Could not save those topics.";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true, message: "Topics saved." });
}
