import { filterDirectoryTools, otherTopicKey, toolTopicKeys } from "@/lib/directory";
import type { ToolEntry } from "@/lib/schema";

export const featuredPerTopic = 3;

export function isFeaturedActive(tool: Pick<ToolEntry, "featured">, today: string): boolean {
  const until = tool.featured?.until;
  if (!until) return false;
  return until >= today;
}

/** Same calendar day always picks the same slugs. The next day advances by one. */
export function pickFeaturedSlugs(
  tools: readonly ToolEntry[],
  today: string,
  limit = featuredPerTopic,
): string[] {
  const active = tools
    .filter((tool) => isFeaturedActive(tool, today))
    .slice()
    .sort((left, right) => left.slug.localeCompare(right.slug));
  if (active.length === 0) return [];
  const start = Number(today.replaceAll("-", "")) % active.length;
  const count = Math.min(limit, active.length);
  const picked: string[] = [];
  for (let index = 0; index < count; index += 1) {
    picked.push(active[(start + index) % active.length].slug);
  }
  return picked;
}

function sponsoredSlugsFor(
  catalog: readonly ToolEntry[],
  topic: string | undefined,
  knownKeys: ReadonlySet<string>,
  today: string,
): string[] {
  if (topic === otherTopicKey) return [];
  if (topic && knownKeys.has(topic)) {
    return pickFeaturedSlugs(
      catalog.filter((tool) => toolTopicKeys(tool).includes(topic)),
      today,
    );
  }
  const slugs: string[] = [];
  const seen = new Set<string>();
  for (const key of knownKeys) {
    const picked = pickFeaturedSlugs(
      catalog.filter((tool) => toolTopicKeys(tool).includes(key)),
      today,
    );
    for (const slug of picked) {
      if (seen.has(slug)) continue;
      seen.add(slug);
      slugs.push(slug);
    }
  }
  return slugs;
}

/**
 * Featured tools that are in today's rotation come first.
 * Search does not change which slugs rotate. It only hides a slug that does not match.
 * The "other" bucket never carries a sponsored slot.
 */
export function presentDirectory(
  catalog: ToolEntry[],
  input: {
    topic?: string;
    q?: string;
    knownKeys: ReadonlySet<string>;
    today: string;
  },
): { tools: ToolEntry[]; sponsoredSlugs: string[] } {
  const filtered = filterDirectoryTools(catalog, {
    topic: input.topic,
    q: input.q,
    knownKeys: input.knownKeys,
  });
  const rotated = sponsoredSlugsFor(catalog, input.topic, input.knownKeys, input.today);
  const sponsoredSlugs = rotated.filter((slug) => filtered.some((tool) => tool.slug === slug));
  const front = sponsoredSlugs.map((slug) => filtered.find((tool) => tool.slug === slug)!);
  const rest = filtered.filter((tool) => !sponsoredSlugs.includes(tool.slug));
  return { tools: [...front, ...rest], sponsoredSlugs };
}
