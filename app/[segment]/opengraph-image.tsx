import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { getSegment, segments } from "@/lib/segments";

export const alt = "Vizonix section";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return segments.map((segment) => ({ segment: segment.slug }));
}

export default async function Image({ params }: { params: Promise<{ segment: string }> }) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  const title =
    segment?.slug === "aviation"
      ? "AI for Aviation: the free daily briefing"
      : segment?.status === "planned"
        ? `${segment.name} is coming soon`
        : (segment?.name ?? "Vizonix");
  return renderOgCard({
    kicker: segment ? `Vizonix ${segment.name}` : "Vizonix",
    title,
    footer: segment?.status === "planned" ? "This section is not publishing yet." : "The briefing is free.",
  });
}
