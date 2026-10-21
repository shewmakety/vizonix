import { NextResponse } from "next/server";
import { AppError, errorMessage } from "@/lib/errors";
import { unsubscribeWithToken } from "@/lib/subscribe";

export const runtime = "nodejs";

const missingToken = "Send the unsubscribe token from your briefing email.";

function oneClickRequest(request: Request): boolean {
  const type = request.headers.get("content-type") ?? "";
  return type.includes("application/x-www-form-urlencoded") || type.includes("multipart/form-data");
}

async function finish(
  result: Awaited<ReturnType<typeof unsubscribeWithToken>>,
  oneClick: boolean,
): Promise<NextResponse> {
  if (!result.ok) {
    if (oneClick) return new NextResponse(null, { status: result.status });
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  if (oneClick) return new NextResponse(null, { status: 202 });
  return NextResponse.json({ ok: true, message: result.message });
}

export async function POST(request: Request) {
  const queryToken = new URL(request.url).searchParams.get("token")?.trim() ?? "";

  try {
    if (oneClickRequest(request)) {
      const form = await request.formData();
      const signal = String(form.get("List-Unsubscribe") ?? "");
      if (signal !== "One-Click" || !queryToken) {
        return NextResponse.json({ error: missingToken }, { status: 400 });
      }
      return await finish(await unsubscribeWithToken(queryToken), true);
    }

    let body: { token?: string };
    try {
      body = (await request.json()) as { token?: string };
    } catch {
      return NextResponse.json({ error: missingToken }, { status: 400 });
    }
    const token = body.token?.trim() || "";
    if (!token) return NextResponse.json({ error: missingToken }, { status: 400 });
    return await finish(await unsubscribeWithToken(token), false);
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: errorMessage(error) }, { status });
  }
}
