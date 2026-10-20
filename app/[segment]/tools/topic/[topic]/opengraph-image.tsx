import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { getSegment, getSegmentTopic, segmentDisplayName, segments, topicPageHeading } from "@/lib/segments";
import { sectionWordmark } from "@/lib/site";

export const alt = "Vizonix topic";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return segments.flatMap((segment) =>
    (segment.topics ?? []).map((topic) => ({ segment: segment.slug, topic: topic.key })),
  );
}

export default async function Image({ params }: { params: Promise<{ segment: string; topic: string }> }) {
  const { segment: slug, topic: topicKey } = await params;
  const segment = getSegment(slug);
  const topic = segment ? getSegmentTopic(segment, topicKey) : undefined;
  return renderOgCard({
    kicker: segment ? sectionWordmark(segmentDisplayName(segment)) : "Vizonix",
    title: segment && topic ? topicPageHeading(segment.name, topic) : "Tool topic",
    footer: "The briefing is free.",
  });
}
