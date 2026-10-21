/** Optional aviation issue sections. Names match the topic field on the issue JSON. */
export const optionalSections = [
  "Recruiting",
  "Sales and marketing",
  "Predictive maintenance",
  "Maintenance activity optimization",
  "Troubleshooting support",
  "Warehousing",
  "AOG support: parts, rotables and technicians",
  "AI Productivity Tools",
] as const;

export type OptionalSection = (typeof optionalSections)[number];

/** Always rendered. They are not checkboxes. */
export const alwaysOnLabels = ["Top story", "The Ramp", "Sponsor slots"] as const;

const allowed = new Set<string>(optionalSections);

/** Topic list for a section. Only aviation issues are sectioned today. */
export function optionalSectionsFor(segment: string): readonly OptionalSection[] {
  if (segment === "aviation") return optionalSections;
  return [];
}

/** Landing-page source such as linkedin. Empty and odd characters are dropped. */
export function cleanSource(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const cleaned = value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 40);
  return cleaned || undefined;
}

/** Catalog order, unknown names dropped, duplicates removed. */
export function normalizeExcluded(values: readonly string[]): OptionalSection[] {
  const picked = new Set<string>();
  for (const value of values) {
    const trimmed = value.trim();
    if (allowed.has(trimmed)) picked.add(trimmed);
  }
  return optionalSections.filter((section) => picked.has(section));
}

export function parseExcluded(
  values: readonly string[],
): { ok: true; excluded: OptionalSection[] } | { ok: false; error: string } {
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (!allowed.has(trimmed)) return { ok: false, error: "Unknown topic." };
  }
  return { ok: true, excluded: normalizeExcluded(values) };
}

/** Checked boxes are kept. A missing picker returns undefined so older clients do not wipe a row. */
export function excludedFromFormData(form: FormData, segment: string): string[] | undefined {
  if (form.get("topic_picker") !== "1") return undefined;
  const checked = new Set(form.getAll("sections").map((value) => String(value)));
  return optionalSectionsFor(segment).filter((section) => !checked.has(section));
}
