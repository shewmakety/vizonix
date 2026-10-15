import { listIssues } from "@/lib/content";
import { configuredTopicsForTool, toolTopicKeys } from "@/lib/directory";
import { issueTools, type Issue, type ToolEntry } from "@/lib/schema";
import { getSegment, segmentTopics, type Segment } from "@/lib/segments";

export function toolPageTitle(tool: ToolEntry, segment: Segment, peers: ToolEntry[]): string {
  const topics = configuredTopicsForTool(segmentTopics(segment), tool);
  const phrase = topics[0]?.phrase ?? `${segment.name.toLowerCase()} operations`;
  const collision = peers.some(
    (other) => other.slug !== tool.slug && other.name.toLowerCase() === tool.name.toLowerCase(),
  );
  const label = collision && tool.company ? `${tool.name} (${tool.company})` : tool.name;
  return `${label} - AI for ${phrase} in ${segment.name.toLowerCase()}`;
}

export function relatedTools(tool: ToolEntry, peers: ToolEntry[], limit = 4): ToolEntry[] {
  const keys = new Set(toolTopicKeys(tool));
  return peers
    .filter((other) => other.slug !== tool.slug && toolTopicKeys(other).some((key) => keys.has(key)))
    .slice(0, limit);
}

export function issuesMentioningTool(segmentSlug: string, slug: string): Issue[] {
  const segment = getSegment(segmentSlug);
  if (!segment) return [];
  return listIssues(segment.slug).filter(
    (issue) => !issue.sample && issueTools(issue).some((tool) => tool.slug === slug),
  );
}
