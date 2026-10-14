import { NextResponse } from "next/server";
import { AppError, errorMessage } from "@/lib/errors";
import { requestUnsubscribeLink, unsubscribeWithToken } from "@/lib/subscribe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { token?: string; email?: string; segment?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Send a token or an email address." }, { status: 400 });
  }

  try {
    if (body.token) {
      const result = await unsubscribeWithToken(body.token);
      if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
      return NextResponse.json({ ok: true, message: result.message });
    }
    if (!body.email) {
      return NextResponse.json({ error: "Send a token or an email address." }, { status: 400 });
    }
    const result = await requestUnsubscribeLink({ email: body.email, segment: body.segment });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json({ ok: true, message: result.message });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: errorMessage(error) }, { status });
  }
}
