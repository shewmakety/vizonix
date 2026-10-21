import { AppError } from "@/lib/errors";

export function supabaseConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}

function config(): { url: string; key: string } | null {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

/** Service-role REST call. The key stays on the server. */
export async function supabaseRest<T>(path: string, init: RequestInit & { prefer?: string } = {}): Promise<T> {
  const cfg = config();
  if (!cfg) throw new AppError("Supabase is not configured.", 503);
  const headers = new Headers(init.headers);
  headers.set("apikey", cfg.key);
  headers.set("authorization", `Bearer ${cfg.key}`);
  headers.set("accept", "application/json");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (init.prefer) headers.set("prefer", init.prefer);
  const response = await fetch(`${cfg.url}/rest/v1/${path}`, { ...init, headers });
  if (!response.ok) {
    const table = path.split("?")[0] || "table";
    const detail = (await response.text()).slice(0, 200);
    console.error(`Supabase ${response.status} on ${table}. ${detail}`);
    throw new AppError("Could not reach the reader list.", response.status === 503 ? 503 : 502);
  }
  if (response.status === 204) return null as T;
  const text = await response.text();
  if (!text) return null as T;
  return JSON.parse(text) as T;
}
