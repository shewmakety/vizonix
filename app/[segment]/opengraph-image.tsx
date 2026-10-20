import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { activeSegments, getSegment, segmentDisplayName } from "@/lib/segments";
import { sectionWordmark } from "@/lib/site";

export const alt = "Vizonix section";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return activeSegments().map((segment) => ({ segment: segment.slug }));
}

export default async function Image({ params }: { params: Promise<{ segment: string }> }) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  const launched = segment?.status === "active" ? segment : undefined;
  const title = launched ? segmentDisplayName(launched) : "Vizonix";
  return renderOgCard({
    kicker: launched ? sectionWordmark(segmentDisplayName(launched)) : "Vizonix",
    title,
    footer: "The briefing is free.",
  });
}
