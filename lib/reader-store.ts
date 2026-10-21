import { normalizeExcluded, type ReaderPref } from "@/lib/reader-topics";

export type StoredPrefs = {
  email: string;
  segment: string;
  excluded: string[];
  source?: string;
};

type StoreFailure = { ok: false; reason: "not_configured" | "request_failed" };

function supabaseConfig(): { url: string; key: string } | undefined {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return undefined;
  return { url: url.replace(/\/$/, ""), key };
}

function eqFilter(column: string, value: string): string {
  const quoted = `"${value.replaceAll('"', '""')}"`;
  return `${column}=eq.${encodeURIComponent(quoted)}`;
}

async function rest(path: string, init?: RequestInit): Promise<unknown> {
  const config = supabaseConfig();
  if (!config) throw new Error("Supabase is not configured.");
  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      authorization: `Bearer ${config.key}`,
      accept: "application/json",
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text.slice(0, 180)}`);
  }
  if (!text) return undefined;
  return JSON.parse(text) as unknown;
}

export function readerStoreConfigured(): boolean {
  return Boolean(supabaseConfig());
}

export async function loadReaderPrefs(segment: string): Promise<
  { configured: false } | { configured: true; prefs: ReaderPref[] }
> {
  if (!supabaseConfig()) return { configured: false };
  const prefs: ReaderPref[] = [];
  const pageSize = 1000;
  for (let offset = 0; offset < 20000; offset += pageSize) {
    const rows = (await rest(
      `subscriber_prefs?segment=eq.${encodeURIComponent(segment)}&select=email,excluded_sections&limit=${pageSize}&offset=${offset}`,
    )) as Array<{ email?: string; excluded_sections?: string[] | null }> | undefined;
    const page = rows ?? [];
    for (const row of page) {
      if (!row.email) continue;
      prefs.push({
        email: row.email.trim().toLowerCase(),
        excludedSections: normalizeExcluded(row.excluded_sections ?? []),
      });
    }
    if (page.length < pageSize) break;
  }
  return { configured: true, prefs };
}

export async function readReaderPrefs(email: string): Promise<
  { state: "missing_config" } | { state: "empty" } | { state: "ready"; prefs: StoredPrefs } | { state: "error" }
> {
  if (!supabaseConfig()) return { state: "missing_config" };
  try {
    const rows = (await rest(
      `subscriber_prefs?${eqFilter("email", email.trim().toLowerCase())}&select=email,segment,excluded_sections,source&limit=1`,
    )) as Array<{
      email?: string;
      segment?: string;
      excluded_sections?: string[] | null;
      source?: string | null;
    }> | undefined;
    const row = rows?.[0];
    if (!row?.email || !row.segment) return { state: "empty" };
    return {
      state: "ready",
      prefs: {
        email: row.email.trim().toLowerCase(),
        segment: row.segment,
        excluded: normalizeExcluded(row.excluded_sections ?? []),
        source: row.source ?? undefined,
      },
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(`Could not read reader prefs: ${detail}`);
    return { state: "error" };
  }
}

export async function persistReaderChoices(input: {
  email: string;
  segment: string;
  excluded: readonly string[];
  suggestion?: string;
  source?: string;
  recordSuggestion: boolean;
}): Promise<{ ok: true } | StoreFailure> {
  if (!supabaseConfig()) return { ok: false, reason: "not_configured" };
  const email = input.email.trim().toLowerCase();
  const row: Record<string, unknown> = {
    email,
    segment: input.segment,
    excluded_sections: normalizeExcluded(input.excluded),
    updated_at: new Date().toISOString(),
  };
  if (input.source) row.source = input.source;
  try {
    await rest("subscriber_prefs?on_conflict=email", {
      method: "POST",
      headers: { prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify(row),
    });
    if (input.recordSuggestion && input.suggestion) {
      await rest("topic_suggestions", {
        method: "POST",
        headers: { prefer: "return=minimal" },
        body: JSON.stringify({
          email,
          segment: input.segment,
          text: input.suggestion,
          source: input.source ?? "signup",
          status: "new",
        }),
      });
    }
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(`Could not save reader choices: ${detail}`);
    return { ok: false, reason: "request_failed" };
  }
}

export async function insertTopicSuggestion(input: {
  email: string;
  segment: string;
  text: string;
  source?: string;
}): Promise<{ ok: true } | StoreFailure> {
  if (!supabaseConfig()) return { ok: false, reason: "not_configured" };
  try {
    await rest("topic_suggestions", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({
        email: input.email.trim().toLowerCase(),
        segment: input.segment,
        text: input.text,
        source: input.source ?? "preferences",
        status: "new",
      }),
    });
    return { ok: true };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(`Could not save a topic suggestion: ${detail}`);
    return { ok: false, reason: "request_failed" };
  }
}
