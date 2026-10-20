import { listTools } from "@/lib/content";
import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { getSegment, segmentDisplayName, segments } from "@/lib/segments";
import { sectionWordmark } from "@/lib/site";

export const alt = "Vizonix tool directory";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return segments.filter((segment) => segment.status === "active").map((segment) => ({ segment: segment.slug }));
}

export default async function Image({ params }: { params: Promise<{ segment: string }> }) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  const count = segment ? listTools(segment.slug).filter((tool) => !tool.sample).length : 0;
  return renderOgCard({
    kicker: segment ? sectionWordmark(segmentDisplayName(segment)) : "Vizonix",
    title: segment ? `${count} AI tools for ${segment.name.toLowerCase()}` : "Tool directory",
    footer: "Each tool has its own page.",
  });
}
