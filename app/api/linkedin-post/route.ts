import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/auth";
import { getIssue } from "@/lib/content";
import { isIsoDate } from "@/lib/dates";
import { postIssueToLinkedIn } from "@/lib/linkedin";
import { getSegment } from "@/lib/segments";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.PUBLISH_SECRET) {
    return NextResponse.json({ error: "PUBLISH_SECRET is not set." }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), process.env.PUBLISH_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: { segment?: unknown; date?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send JSON with a segment and a date." }, { status: 400 });
  }

  const segment = typeof body.segment === "string" ? body.segment.trim() : "";
  const date = typeof body.date === "string" ? body.date.trim() : "";
  if (!/^[a-z0-9-]+$/.test(segment) || !getSegment(segment)) {
    return NextResponse.json({ error: "Unknown section." }, { status: 400 });
  }
  if (!isIsoDate(date)) {
    return NextResponse.json({ error: "Issue date is not a real calendar date." }, { status: 400 });
  }

  let issue;
  try {
    issue = getIssue(segment, date);
  } catch {
    return NextResponse.json({ error: "Issue file could not be read." }, { status: 400 });
  }
  if (!issue) {
    return NextResponse.json({ error: "Issue file was not found." }, { status: 404 });
  }
  if (issue.sample) {
    return NextResponse.json({ error: "Refusing to post a sample issue." }, { status: 400 });
  }

  const result = await postIssueToLinkedIn(issue);
  const payload: { postId?: string; skipped?: string; error?: string } = {};
  if (result.postId) payload.postId = result.postId;
  if (result.skipped) payload.skipped = result.skipped;
  if (result.error) payload.error = result.error;
  const status = result.ok || result.skipped ? 200 : 502;
  return NextResponse.json(payload, { status });
}
