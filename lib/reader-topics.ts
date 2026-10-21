/**
 * Aviation sections a reader can turn off.
 * Top story, The Ramp, and sponsor slots are not in this list.
 * Order matches the weekday issue. The last entry is AI Productivity Tools.
 */
export const OPTIONAL_AVIATION_SECTIONS = [
  "Recruiting",
  "Sales and marketing",
  "Predictive maintenance",
  "Maintenance activity optimization",
  "Troubleshooting support",
  "Warehousing",
  "AOG support: parts, rotables and technicians",
  "AI Productivity Tools",
] as const;

export const ALWAYS_ON_NOTE = "Top story, The Ramp, and sponsor slots stay in every issue.";

export const SUGGESTION_MAX = 400;

export type ReaderPref = {
  email: string;
  excludedSections: string[];
};

export type ReaderGroup = {
  excluded: string[];
  emails: string[];
};

export type PendingChoices = {
  excluded: string[];
  suggestion?: string;
  source?: string;
};

const catalogIndex = new Map(OPTIONAL_AVIATION_SECTIONS.map((topic, index) => [topic.toLowerCase(), index]));

export function normalizeExcluded(values: readonly string[]): string[] {
  const indexes = new Set<number>();
  for (const value of values) {
    const index = catalogIndex.get(value.trim().toLowerCase());
    if (index !== undefined) indexes.add(index);
  }
  return OPTIONAL_AVIATION_SECTIONS.filter((_, index) => indexes.has(index));
}

export function includedFromExcluded(excluded: readonly string[]): string[] {
  const skip = new Set(normalizeExcluded(excluded));
  return OPTIONAL_AVIATION_SECTIONS.filter((topic) => !skip.has(topic));
}

export function parseIncluded(values: unknown): { ok: true; excluded: string[] } | { ok: false; error: string } {
  if (!Array.isArray(values) || !values.every((item) => typeof item === "string")) {
    return { ok: false, error: "Choose sections from the list." };
  }
  const known = new Set<string>(OPTIONAL_AVIATION_SECTIONS.map((topic) => topic.toLowerCase()));
  const chosen = new Set<string>();
  for (const value of values) {
    const canonical = catalogIndex.get(value.trim().toLowerCase());
    if (canonical === undefined || !known.has(value.trim().toLowerCase())) {
      return { ok: false, error: "Choose sections from the list." };
    }
    chosen.add(OPTIONAL_AVIATION_SECTIONS[canonical]);
  }
  return {
    ok: true,
    excluded: OPTIONAL_AVIATION_SECTIONS.filter((topic) => !chosen.has(topic)),
  };
}

export function parseExcluded(values: unknown): { ok: true; excluded: string[] } | { ok: false; error: string } {
  if (!Array.isArray(values) || values.length > OPTIONAL_AVIATION_SECTIONS.length) {
    return { ok: false, error: "Choose sections from the list." };
  }
  if (!values.every((item) => typeof item === "string")) {
    return { ok: false, error: "Choose sections from the list." };
  }
  for (const value of values) {
    if (!catalogIndex.has(value.trim().toLowerCase())) {
      return { ok: false, error: "Choose sections from the list." };
    }
  }
  return { ok: true, excluded: normalizeExcluded(values) };
}

export function parseSuggestion(value: unknown): { ok: true; text: string } | { ok: false; error: string } {
  const text = String(value ?? "")
    .replace(/[\u0000-\u001f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return { ok: false, error: "Write a topic first." };
  if (text.length > SUGGESTION_MAX) {
    return { ok: false, error: `Keep the suggestion under ${SUGGESTION_MAX} characters.` };
  }
  return { ok: true, text };
}

/** Campaign code from ?src=. Empty and odd values are dropped. */
export function cleanSource(value: unknown): string | undefined {
  const raw = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(raw)) return undefined;
  return raw;
}

export function exclusionKey(excluded: readonly string[]): string {
  return normalizeExcluded(excluded).join("\n");
}

/**
 * One group per identical excluded set.
 * A reader with no saved prefs joins the full-issue group (nothing excluded).
 * Duplicate addresses are kept once, in first-seen order.
 */
export function groupSubscribersByExclusion(subscribers: readonly string[], prefs: readonly ReaderPref[]): {
  confirmed: string[];
  groups: ReaderGroup[];
} {
  const prefMap = new Map<string, string[]>();
  for (const pref of prefs) {
    prefMap.set(pref.email.trim().toLowerCase(), normalizeExcluded(pref.excludedSections));
  }
  const confirmed: string[] = [];
  const seen = new Set<string>();
  const groups = new Map<string, ReaderGroup>();
  for (const raw of subscribers) {
    const email = raw.trim().toLowerCase();
    if (!email || seen.has(email)) continue;
    seen.add(email);
    confirmed.push(email);
    const excluded = prefMap.get(email) ?? [];
    const key = excluded.join("\n");
    const group = groups.get(key);
    if (group) group.emails.push(email);
    else groups.set(key, { excluded: [...excluded], emails: [email] });
  }
  return { confirmed, groups: [...groups.values()] };
}

/** Throws when the plan would skip a confirmed reader or email someone twice. */
export function assertTargetedOnce(confirmed: readonly string[], groups: readonly ReaderGroup[]): void {
  const targeted = groups.flatMap((group) => group.emails);
  const unique = new Set(targeted);
  if (unique.size !== targeted.length) {
    throw new Error(
      `Personalized send targeted ${targeted.length - unique.size} addresses more than once.`,
    );
  }
  const confirmedSet = new Set(confirmed);
  if (unique.size !== confirmedSet.size) {
    throw new Error(
      `Personalized send targeted ${unique.size} readers. ${confirmedSet.size} confirmed subscribers were expected.`,
    );
  }
  for (const email of unique) {
    if (!confirmedSet.has(email)) {
      throw new Error("Personalized send included an address that is not a confirmed subscriber.");
    }
  }
  for (const email of confirmedSet) {
    if (!unique.has(email)) {
      throw new Error("Personalized send missed a confirmed subscriber.");
    }
  }
}
