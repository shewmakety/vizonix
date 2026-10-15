import { ToolDirectory } from "@/components/ToolDirectory";
import { listTools } from "@/lib/content";
import {
  directoryChips,
  filterDirectoryTools,
  knownTopicKeys,
  otherTopicKey,
} from "@/lib/directory";
import type { DirectoryView } from "@/lib/directory-view";
import { type Segment, topicPagePath } from "@/lib/segments";

export function DirectoryBrowser({
  segment,
  view,
  query,
  activeTopic,
  linkMode,
}: {
  segment: Segment;
  view: DirectoryView;
  query: string;
  /** A configured topic key, or "other". Omit for the full directory. */
  activeTopic?: string;
  /** Query chips keep ?topic= on the directory. Path chips link to topic pages. */
  linkMode: "query" | "path";
}) {
  const topics = segment.topics ?? [];
  const tools = listTools(segment.slug);
  const filtered = filterDirectoryTools(tools, {
    topic: activeTopic,
    q: query,
    knownKeys: knownTopicKeys(topics),
  });
  const onTopicPage = linkMode === "path" && activeTopic && activeTopic !== otherTopicKey;
  const searchAction = onTopicPage ? topicPagePath(segment.slug, activeTopic) : `/${segment.slug}/tools`;
  const hiddenTopic = !onTopicPage && activeTopic ? activeTopic : undefined;

  return (
    <ToolDirectory
      segmentSlug={segment.slug}
      tools={filtered}
      initialView={view}
      chips={directoryChips(segment.slug, topics, tools, linkMode)}
      activeKey={activeTopic ?? "all"}
      query={query}
      searchAction={searchAction}
      hiddenTopic={hiddenTopic}
    />
  );
}
