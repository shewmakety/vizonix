import { allTools, getTool, listTools } from "@/lib/content";
import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { getSegment, segmentDisplayName } from "@/lib/segments";
import { sectionWordmark } from "@/lib/site";
import { toolPageTitle } from "@/lib/tool-page";

export const alt = "Vizonix tool";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return allTools().map((tool) => ({ segment: tool.segment, slug: tool.slug }));
}

export default async function Image({ params }: { params: Promise<{ segment: string; slug: string }> }) {
  const { segment: slug, slug: toolSlug } = await params;
  const segment = getSegment(slug);
  const tool = segment ? getTool(slug, toolSlug) : undefined;
  const title = segment && tool ? toolPageTitle(tool, segment, listTools(slug)) : (tool?.name ?? "Tool");
  return renderOgCard({
    kicker: segment ? sectionWordmark(segmentDisplayName(segment)) : "Vizonix",
    title,
    footer: tool?.company ?? "The briefing is free.",
  });
}
