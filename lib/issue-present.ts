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

/** Kicker on a filled section sponsor. */
export const sectionSponsorKicker = "Section sponsor";

/** Placeholder when a numbered section has no sponsor of its own. */
export const sectionSponsorOpenLabel = "Sponsor this section - Open";

/** Visible lead kicker. The stored kicker stays the icon key. */
export const topStoryLabel = "Today's top story";

/**
 * Heading readers see. Stored topic names stay as they are so preferences still match.
 * Lowercase words are title-cased, and the word "and" is shown as &.
 */
export function sectionHeadingLabel(topic: string): string {
  return topic
    .split(/(\s+)/)
    .map((part) => {
      if (/^\s+$/.test(part)) return part;
      const match = part.match(/^([^A-Za-z]*)([A-Za-z]+)([^A-Za-z]*)$/);
      if (!match) return part;
      const [, prefix, word, suffix] = match;
      if (word.toLowerCase() === "and") return `${prefix}&${suffix}`;
      if (word !== word.toLowerCase()) return part;
      return `${prefix}${word.charAt(0).toUpperCase()}${word.slice(1)}${suffix}`;
    })
    .join("");
}

/** Host shown on a tool's vendor link. */
export function vendorWebsiteLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Split a pricing line so "Contact the vendor" can become the vendor link. */
export function contactVendorParts(
  pricing: string,
): { before: string; phrase: string; after: string } | null {
  const match = /contact the vendor/i.exec(pricing);
  if (!match || match.index === undefined) return null;
  return {
    before: pricing.slice(0, match.index),
    phrase: pricing.slice(match.index, match.index + match[0].length),
    after: pricing.slice(match.index + match[0].length),
  };
}

/** Gold line under the issue title. The site masthead keeps the shorter edition name. */
export function issueHeaderLine(issue: Pick<Issue, "segment" | "date">): string {
  const segment = getSegment(issue.segment);
  const edition = segment ? segmentDisplayName(segment) : issue.segment;
  const lineEdition =
    edition === "AI & Robotics News For Aviation" ? `Customizable ${edition}` : edition;
  return `${sectionWordmark(lineEdition)} · ${formatIssueDate(issue)}`;
}
