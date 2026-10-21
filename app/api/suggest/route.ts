import { NextResponse } from "next/server";
import { z } from "zod";
import { AppError } from "@/lib/errors";
import { saveTopicSuggestion } from "@/lib/prefs";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { cleanSource } from "@/lib/reader-sections";
import { getSegment } from "@/lib/segments";
import { tokenSecret, verifyToken } from "@/lib/tokens";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().trim().min(1),
  text: z.string().trim().min(1).max(500),
  source: z.string().trim().max(80).optional(),
});

export async function POST(request: Request) {
  if (!rateLimit(`${requestIp(request)}:suggest`)) {
    return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with a token and a topic." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a topic suggestion, up to 500 characters." }, { status: 400 });
  }

  const secret = tokenSecret();
  if (!secret) return NextResponse.json({ error: "Suggestions are not configured." }, { status: 503 });
  const payload = verifyToken(parsed.data.token, secret, "preferences");
  if (!payload) {
    return NextResponse.json({ error: "This preferences link is invalid or expired." }, { status: 400 });
  }
  const segment = getSegment(payload.segment);
  if (!segment || segment.status !== "active") {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }

  try {
    await saveTopicSuggestion({
      email: payload.email,
      segment: segment.slug,
      text: parsed.data.text,
      source: cleanSource(parsed.data.source) ?? "preferences",
    });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 502;
    const message = error instanceof AppError ? error.message : "Could not save that suggestion.";
    return NextResponse.json({ error: message }, { status });
  }

  return NextResponse.json({ ok: true, message: "Suggestion sent." });
}
