import type { DirectoryView } from "@/lib/directory-view";
import type { ToolEntry } from "@/lib/schema";
import { type Segment, type SegmentTopic, topicPagePath } from "@/lib/segments";

export const otherTopicKey = "other";

export function firstQueryValue(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim();
}

/** Topic keys on a tool. `topics` and `topic` are combined. */
export function toolTopicKeys(tool: Pick<ToolEntry, "topic" | "topics">): string[] {
  return [...new Set([...(tool.topics ?? []), ...(tool.topic ? [tool.topic] : [])])];
}

export function knownTopicKeys(topics: SegmentTopic[]): Set<string> {
  return new Set(topics.map((topic) => topic.key));
}

export function configuredTopicsForTool(topics: SegmentTopic[], tool: Pick<ToolEntry, "topic" | "topics">): SegmentTopic[] {
  const keys = new Set(toolTopicKeys(tool));
  return topics.filter((topic) => keys.has(topic.key));
}

export function filterDirectoryTools(
  tools: ToolEntry[],
  input: { topic?: string; q?: string; knownKeys: ReadonlySet<string> },
): ToolEntry[] {
  const topic = input.topic?.trim();
  const query = input.q?.trim().toLowerCase();
  return tools.filter((tool) => {
    const keys = toolTopicKeys(tool).filter((key) => input.knownKeys.has(key));
    if (topic === otherTopicKey) {
      if (keys.length > 0) return false;
    } else if (topic && input.knownKeys.has(topic)) {
      if (!keys.includes(topic)) return false;
    }
    if (!query) return true;
    const haystack = `${tool.name}\n${tool.company ?? ""}\n${tool.summary}`.toLowerCase();
    return haystack.includes(query);
  });
}

export type DirectoryChip = {
  key: string;
  label: string;
  count: number;
  href: string;
};

export function directoryChips(
  segmentSlug: string,
  topics: SegmentTopic[],
  tools: ToolEntry[],
  mode: "query" | "path",
): DirectoryChip[] {
  const known = knownTopicKeys(topics);
  const untagged = tools.filter((tool) => toolTopicKeys(tool).every((key) => !known.has(key))).length;
  const chips: DirectoryChip[] = [
    { key: "all", label: "All", count: tools.length, href: `/${segmentSlug}/tools` },
    ...topics.map((topic) => ({
      key: topic.key,
      label: topic.label,
      count: tools.filter((tool) => toolTopicKeys(tool).includes(topic.key)).length,
      href:
        mode === "path"
          ? topicPagePath(segmentSlug, topic.key)
          : `/${segmentSlug}/tools?topic=${encodeURIComponent(topic.key)}`,
    })),
  ];
  if (untagged > 0) {
    chips.push({
      key: otherTopicKey,
      label: "Other",
      count: untagged,
      href: `/${segmentSlug}/tools?topic=${otherTopicKey}`,
    });
  }
  return chips;
}

/** Keep topic params already on href, and add the current search and view. */
export function withDirectoryQuery(href: string, input: { q?: string; view?: DirectoryView }): string {
  const [pathname, existing] = href.split("?");
  const params = new URLSearchParams(existing ?? "");
  const query = input.q?.trim();
  if (query) params.set("q", query);
  else params.delete("q");
  if (input.view === "list") params.set("view", "list");
  else params.delete("view");
  const search = params.toString();
  return search ? `${pathname}?${search}` : pathname;
}

export function directoryCanonical(segment: Segment, topicKey: string | undefined): string {
  if (topicKey && topicKey !== otherTopicKey) {
    const topic = segment.topics?.find((item) => item.key === topicKey);
    if (topic) return topicPagePath(segment.slug, topic.key);
  }
  return `/${segment.slug}/tools`;
}
