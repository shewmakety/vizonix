import { NextResponse } from "next/server";
import { getSegment } from "@/lib/segments";
import { insertTopicSuggestion } from "@/lib/reader-store";
import { SUGGESTION_MAX, cleanSource, parseSuggestion } from "@/lib/reader-topics";
import {
  READER_WRITE_LIMIT,
  READER_WRITE_WINDOW_MS,
  READER_IP_LIMIT,
  clientAddress,
  rateLimit,
} from "@/lib/rate-limit";
import { tokenSecret, verifyToken } from "@/lib/tokens";
import { z } from "zod";

export const runtime = "nodejs";

const bodySchema = z.object({
  token: z.string().trim().min(1).max(8000),
  text: z.string().max(SUGGESTION_MAX + 40),
  source: z.string().max(80).optional(),
});

function tooMany(): NextResponse {
  return NextResponse.json({ error: "Too many requests. Try again in a few minutes." }, { status: 429 });
}

export async function POST(request: Request) {
  const ipLimit = rateLimit(`reader-ip:${clientAddress(request)}`, READER_IP_LIMIT, READER_WRITE_WINDOW_MS);
  if (!ipLimit.ok) return tooMany();

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Send JSON with a token and a topic." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Send a preferences link and a short topic." }, { status: 400 });
  }

  const secret = tokenSecret();
  if (!secret) {
    return NextResponse.json({ error: "Suggestions are not configured yet." }, { status: 503 });
  }
  const payload = verifyToken(parsed.data.token, secret, "preferences");
  if (!payload) {
    return NextResponse.json({ error: "This preferences link is invalid or expired." }, { status: 400 });
  }
  const segment = getSegment(payload.segment);
  if (!segment || segment.status !== "active") {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }
  const emailLimit = rateLimit(`suggest:${payload.email}`, READER_WRITE_LIMIT, READER_WRITE_WINDOW_MS);
  if (!emailLimit.ok) return tooMany();

  const suggestion = parseSuggestion(parsed.data.text);
  if (!suggestion.ok) return NextResponse.json({ error: suggestion.error }, { status: 400 });

  const saved = await insertTopicSuggestion({
    email: payload.email,
    segment: segment.slug,
    text: suggestion.text,
    source: cleanSource(parsed.data.source) ?? "preferences",
  });
  if (!saved.ok && saved.reason === "not_configured") {
    return NextResponse.json({ error: "Topic suggestions are not configured yet." }, { status: 503 });
  }
  if (!saved.ok) {
    return NextResponse.json({ error: "Could not save that suggestion." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, message: "Thanks. We read every suggestion." });
}
