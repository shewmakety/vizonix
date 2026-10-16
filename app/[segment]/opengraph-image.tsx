import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { activeSegments, getSegment } from "@/lib/segments";

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
  const title =
    launched?.slug === "aviation" ? "AI for Aviation: the free daily briefing" : (launched?.name ?? "Vizonix");
  return renderOgCard({
    kicker: launched ? `Vizonix ${launched.name}` : "Vizonix",
    title,
    footer: "The briefing is free.",
  });
}
