import { formatIssueDate } from "@/lib/dates";
import { productivitySectionTopic, type Issue } from "@/lib/schema";
import { getSegment, segmentDisplayName } from "@/lib/segments";
import { absoluteUrl, sectionWordmark } from "@/lib/site";

/** Callout on each story tile. The same line on every issue. */
export const whyItPaysLabel = "$ Why it pays";

/** Top of a forwarded email. Fixed marketing URL, not the current site origin. */
export const forwardedSubscribeUrl = "https://www.vizonix.com/join?src=forwarded";

export function sectionAnchor(topic: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

/** Chip label. A long "Topic: detail" heading keeps the part before the colon. */
export function chipLabel(topic: string): string {
  if (topic === productivitySectionTopic) return topic;
  const colon = topic.indexOf(":");
  return colon > 0 ? topic.slice(0, colon).trim() : topic;
}

export function issueWebUrl(issue: Pick<Issue, "segment" | "date">): string {
  return absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
}

/** Public issue URL with the forward source, for the mailto body. */
export function forwardIssueUrl(issue: Pick<Issue, "segment" | "date">): string {
  return `${issueWebUrl(issue)}?src=forward`;
}

/** mailto whose subject is the issue title and whose body contains the forward URL. */
export function forwardMailto(issue: Pick<Issue, "segment" | "date" | "subject">): string {
  return `mailto:?subject=${encodeURIComponent(issue.subject)}&body=${encodeURIComponent(forwardIssueUrl(issue))}`;
}

/** Gold line under the issue title. The site masthead keeps the shorter edition name. */
export function issueHeaderLine(issue: Pick<Issue, "segment" | "date">): string {
  const segment = getSegment(issue.segment);
  const edition = segment ? segmentDisplayName(segment) : issue.segment;
  const lineEdition =
    edition === "AI & Robotics News For Aviation" ? `Customizable ${edition}` : edition;
  return `${sectionWordmark(lineEdition)} · ${formatIssueDate(issue)}`;
}
