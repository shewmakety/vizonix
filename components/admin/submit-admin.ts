export async function submitAdmin(
  path: string,
  method: "POST" | "PATCH" | "DELETE",
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: "The request did not go through. Try again." };
  }
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) return { ok: false, error: payload.error || "Could not save." };
  return { ok: true };
}
