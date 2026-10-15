import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { featuredSegment } from "@/lib/segments";

export const alt = "Vizonix";
export const size = ogSize;
export const contentType = ogContentType;

export default function OpenGraphImage() {
  const featured = featuredSegment();
  return renderOgCard({
    title: "Free daily AI briefing for a specific business.",
    footer: `${featured.name} is the launch section. The briefing is free.`,
  });
}
