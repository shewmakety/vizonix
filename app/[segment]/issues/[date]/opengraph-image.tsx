import { getIssue, allIssues } from "@/lib/content";
import { issueDateLine } from "@/lib/dates";
import { ogContentType, ogSize, renderOgCard } from "@/lib/og-card";
import { getSegment, segmentDisplayName } from "@/lib/segments";
import { sectionWordmark } from "@/lib/site";

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
    kicker: segment ? sectionWordmark(segmentDisplayName(segment)) : "Vizonix",
    title: issue?.subject ?? "Issue",
    footer: issue ? issueDateLine(issue) : "The briefing is free.",
  });
}
