import { NextResponse } from "next/server";
import { adminTokenFromRequest, sameOrigin, verifyAdminSession } from "@/lib/admin-session";
import { AppError, errorMessage } from "@/lib/errors";
import { turnstileTokenFrom, verifyTurnstile } from "@/lib/turnstile";
import type { TurnstileAction } from "@/lib/turnstile-public";

export function adminJson(body: unknown, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

export function requireAdminRequest(request: Request): NextResponse | null {
  if (!sameOrigin(request)) return adminJson({ error: "Forbidden." }, 403);
  if (!verifyAdminSession(adminTokenFromRequest(request))) {
    return adminJson({ error: "Sign in required." }, 401);
  }
  return null;
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | NextResponse> {
  try {
    const raw: unknown = await request.json();
    if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw as Record<string, unknown>;
    return adminJson({ error: "Send JSON." }, 400);
  } catch {
    return adminJson({ error: "Send JSON." }, 400);
  }
}

export function isNextResponse(value: unknown): value is NextResponse {
  return value instanceof Response;
}

export async function enforceTurnstile(
  request: Request,
  body: Record<string, unknown>,
  action: TurnstileAction,
): Promise<NextResponse | null> {
  const verified = await verifyTurnstile({
    token: turnstileTokenFrom(body),
    action,
    remoteip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  });
  if (!verified.ok) return adminJson({ error: verified.error }, verified.status);
  return null;
}

export function adminError(error: unknown, duplicate?: string): NextResponse {
  if (duplicate && error instanceof AppError && error.status === 409) {
    return adminJson({ error: duplicate }, 409);
  }
  const status = error instanceof AppError ? error.status : 500;
  return adminJson({ error: errorMessage(error) }, status);
}
