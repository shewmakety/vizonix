import { NextResponse } from "next/server";
import { bearerMatches } from "@/lib/auth";
import { AppError, errorMessage } from "@/lib/errors";
import { publishIssue } from "@/lib/publish";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.PUBLISH_SECRET) {
    return NextResponse.json({ error: "PUBLISH_SECRET is not set." }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get("authorization"), process.env.PUBLISH_SECRET)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body: {
    issue?: unknown;
    send?: boolean;
    write?: boolean;
    allowSample?: boolean;
    testTo?: string;
    linkedin?: boolean;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send a JSON issue payload." }, { status: 400 });
  }
  if (!body.issue) {
    return NextResponse.json({ error: "Missing issue." }, { status: 400 });
  }

  try {
    const result = await publishIssue(body.issue, {
      send: body.send !== false,
      write: body.write !== false,
      allowSample: body.allowSample === true,
      testTo: body.testTo,
      linkedin: body.linkedin !== false,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json({ error: errorMessage(error) }, { status });
  }
}
