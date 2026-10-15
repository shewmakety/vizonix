import { getIssue, allIssues } from "@/lib/content";
import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { getSegment } from "@/lib/segments";

export const alt = "Vizonix issue";
export const size = ogSize;
export const contentType = ogContentType;

export function generateStaticParams() {
  return allIssues().map((issue) => ({ segment: issue.segment, date: issue.date }));
}

export default async function Image({ params }: { params: Promise<{ segment: string; date: string }> }) {
  const { segment: slug, date } = await params;
  const issue = getIssue(slug, date);
  const segment = getSegment(slug);
  return renderOgCard({
    kicker: segment ? `Vizonix ${segment.name}` : "Vizonix",
    title: issue?.subject ?? "Issue",
    footer: issue?.preheader ?? "The briefing is free.",
  });
}
