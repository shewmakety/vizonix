import { notFound } from "next/navigation";
import { NextResponse } from "next/server";
import { publishedIssuePath } from "@/lib/content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ segment: string }> };

/** Temporary redirect. A permanent one would stick in the browser after the next issue ships. */
export async function GET(request: Request, { params }: Props) {
  const { segment } = await params;
  const path = publishedIssuePath(segment);
  if (!path) notFound();
  return NextResponse.redirect(new URL(path, request.url), 307);
}
