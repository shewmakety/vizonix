import { AppError } from "@/lib/errors";
import { normalizeExcluded } from "@/lib/reader-sections";
import { issueSections, type Issue, type IssueSectionView } from "@/lib/schema";

export type ReaderPref = {
  email: string;
  excludedSections: readonly string[];
};

export type SendGroup = {
  /** Catalog order. Empty means the full issue. */
  excluded: string[];
  key: string;
  emails: string[];
};

export function confirmedEmails(emails: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const email of emails) {
    const normalized = email.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }
  return result;
}

function groupKey(excluded: readonly string[]): string {
  return excluded.join("\n");
}

/**
 * Readers with the same excluded set share one rendered issue.
 * A reader with no row gets the full issue, the same group as an empty exclusion list.
 */
export function groupSubscribers(subscribers: readonly string[], prefs: readonly ReaderPref[]): SendGroup[] {
  const byEmail = new Map<string, string[]>();
  for (const pref of prefs) {
    const email = pref.email.trim().toLowerCase();
    if (!email) continue;
    byEmail.set(email, normalizeExcluded(pref.excludedSections));
  }

  const groups = new Map<string, SendGroup>();
  for (const email of confirmedEmails(subscribers)) {
    const excluded = byEmail.get(email) ?? [];
    const key = groupKey(excluded);
    const group = groups.get(key);
    if (group) group.emails.push(email);
    else groups.set(key, { excluded, key, emails: [email] });
  }

  return [...groups.values()]
    .map((group) => ({ ...group, emails: [...group.emails].sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/** Throws unless the groups cover each confirmed address once and no one else. */
export function assertTargetedOnce(subscribers: readonly string[], groups: readonly SendGroup[]): void {
  const expected = confirmedEmails(subscribers);
  const expectedSet = new Set(expected);
  const seen = new Set<string>();
  let duplicates = 0;
  for (const group of groups) {
    for (const email of group.emails) {
      if (seen.has(email)) duplicates += 1;
      seen.add(email);
    }
  }
  let missing = 0;
  for (const email of expected) {
    if (!seen.has(email)) missing += 1;
  }
  let extra = 0;
  for (const email of seen) {
    if (!expectedSet.has(email)) extra += 1;
  }
  if (missing || extra || duplicates || seen.size !== expected.length) {
    throw new AppError(
      `Every confirmed subscriber must be targeted exactly once. Missing ${missing}, extra ${extra}, duplicate ${duplicates}.`,
      500,
    );
  }
}

export function planIssueDelivery(subscribers: readonly string[], prefs: readonly ReaderPref[]): SendGroup[] {
  const groups = groupSubscribers(subscribers, prefs);
  assertTargetedOnce(subscribers, groups);
  return groups;
}

/** Drop optional topic sections the reader turned off. A section sponsor leaves with its section. Lead, Ramp, and the issue sponsor slots stay. */
export function sectionsForReader(issue: Issue, excluded: readonly string[] | undefined): IssueSectionView[] {
  const blocked = new Set<string>(normalizeExcluded(excluded ?? []));
  if (blocked.size === 0) return issueSections(issue);
  return issueSections(issue).filter((section) => !section.topic || !blocked.has(section.topic));
}
