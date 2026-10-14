import { NextResponse } from "next/server";
import { confirmSubscription } from "@/lib/subscribe";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: { token?: string };
  try {
    body = (await request.json()) as { token?: string };
  } catch {
    return NextResponse.json({ error: "Missing confirmation token." }, { status: 400 });
  }
  if (!body.token) {
    return NextResponse.json({ error: "Missing confirmation token." }, { status: 400 });
  }
  const result = await confirmSubscription(body.token);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ ok: true, message: result.message });
}
