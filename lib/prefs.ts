import { AppError } from "@/lib/errors";
import { cleanSource, normalizeExcluded } from "@/lib/reader-sections";
import { supabaseConfigured, supabaseRest } from "@/lib/supabase-admin";

type PrefRow = {
  email?: string;
  excluded_sections?: string[] | null;
  source?: string | null;
};

export type StoredPrefs = {
  excludedSections: string[];
  source: string | null;
};

const pageSize = 1000;

function emailOf(value: string): string {
  return value.trim().toLowerCase();
}

export async function loadExclusionMap(segment: string): Promise<Map<string, string[]> | null> {
  if (!supabaseConfigured()) return null;
  const map = new Map<string, string[]>();
  for (let offset = 0; offset < 200000; offset += pageSize) {
    const rows = await supabaseRest<PrefRow[]>(
      `subscriber_prefs?select=email,excluded_sections&segment=eq.${encodeURIComponent(segment)}&order=email.asc&limit=${pageSize}&offset=${offset}`,
      { method: "GET" },
    );
    const list = Array.isArray(rows) ? rows : [];
    for (const row of list) {
      if (!row.email) continue;
      const excluded = Array.isArray(row.excluded_sections) ? row.excluded_sections : [];
      map.set(emailOf(row.email), normalizeExcluded(excluded));
    }
    if (list.length < pageSize) break;
  }
  return map;
}

export async function getSubscriberPrefs(email: string): Promise<StoredPrefs | null> {
  if (!supabaseConfigured()) return null;
  const rows = await supabaseRest<PrefRow[]>(
    `subscriber_prefs?select=email,excluded_sections,source&email=eq.${encodeURIComponent(emailOf(email))}&limit=1`,
    { method: "GET" },
  );
  const row = Array.isArray(rows) ? rows[0] : undefined;
  if (!row) return null;
  const excluded = Array.isArray(row.excluded_sections) ? row.excluded_sections : [];
  return { excludedSections: normalizeExcluded(excluded), source: row.source ?? null };
}

async function upsertPrefs(input: {
  email: string;
  segment: string;
  excluded: readonly string[];
  source?: string;
}): Promise<void> {
  const row: Record<string, unknown> = {
    email: emailOf(input.email),
    segment: input.segment,
    excluded_sections: normalizeExcluded(input.excluded),
    updated_at: new Date().toISOString(),
  };
  if (input.source) row.source = input.source;
  await supabaseRest("subscriber_prefs?on_conflict=email", {
    method: "POST",
    prefer: "resolution=merge-duplicates,return=minimal",
    body: JSON.stringify(row),
  });
}

async function insertSuggestion(input: {
  email: string;
  segment: string;
  text: string;
  source?: string;
}): Promise<void> {
  const row: Record<string, unknown> = {
    email: emailOf(input.email),
    segment: input.segment,
    text: input.text.trim(),
    status: "new",
  };
  if (input.source) row.source = input.source;
  await supabaseRest("topic_suggestions", {
    method: "POST",
    prefer: "return=minimal",
    body: JSON.stringify(row),
  });
}

export async function saveSubscriberPrefs(input: {
  email: string;
  segment: string;
  excluded: readonly string[];
  source?: string;
}): Promise<void> {
  if (!supabaseConfigured()) throw new AppError("Topic choices are not available yet.", 503);
  await upsertPrefs(input);
}

export async function saveTopicSuggestion(input: {
  email: string;
  segment: string;
  text: string;
  source?: string;
}): Promise<void> {
  if (!supabaseConfigured()) throw new AppError("Topic suggestions are not available yet.", 503);
  const text = input.text.trim();
  if (!text || text.length > 500) throw new AppError("Keep the topic suggestion to 500 characters.", 400);
  await insertSuggestion({ ...input, text });
}

/**
 * Called after a confirm link is accepted.
 * Logs and continues when storage is down so the list confirmation still stands.
 */
export async function saveConfirmedChoices(input: {
  email: string;
  segment: string;
  excluded?: string[];
  suggestion?: string;
  source?: string;
}): Promise<void> {
  const source = cleanSource(input.source);
  const suggestion = input.suggestion?.trim();
  if (!Array.isArray(input.excluded) && !suggestion) return;
  if (!supabaseConfigured()) {
    console.error("Reader choices were not saved: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    return;
  }
  if (Array.isArray(input.excluded)) {
    try {
      await upsertPrefs({
        email: input.email,
        segment: input.segment,
        excluded: input.excluded,
        source,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      console.error(`Reader topics were not saved for ${input.segment}: ${detail}`);
    }
  }
  if (suggestion) {
    try {
      await insertSuggestion({
        email: input.email,
        segment: input.segment,
        text: suggestion.slice(0, 500),
        source,
      });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      console.error(`Topic suggestion was not saved for ${input.segment}: ${detail}`);
    }
  }
}
