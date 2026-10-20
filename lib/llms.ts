import { listIssues, listTools } from "@/lib/content";
import { toolTopicKeys } from "@/lib/directory";
import { issueSections } from "@/lib/schema";
import {
  classifiedRatio,
  exclusivityPremium,
  formatUsd,
  foundingSponsorCap,
  launchPlacements,
  maxNewsletterSponsors,
  publishedPrimaryLadder,
  scaledFromPrimary,
  secondaryRatio,
} from "@/lib/rate-card";
import { activeSegments, getSegment, segmentDisplayName, topicPagePath, type Segment } from "@/lib/segments";
import { absoluteUrl, editor, organizationSameAs, site } from "@/lib/site";

function firstSentence(text: string): string {
  const match = text.match(/^[\s\S]{1,240}?[.](?:\s|$)/);
  return (match ? match[0] : text).replace(/\s+/g, " ").trim();
}

function identityLines(): string[] {
  return [
    `# ${site.name}`,
    "",
    `Vizonix is a free weekday morning briefing on AI tools, bots, models, and resources that make a specific business more profitable. Aviation is the launch section.`,
    "",
    `${editor.name}, ${editor.jobTitle}, publishes Vizonix. He has an aviation industry background and is the founder of AOG Alerts and MRO List.`,
    "",
    `Profiles: ${organizationSameAs.join(", ")}.`,
    "",
    "The email is free. Revenue is weekly sponsorship from AI companies. Sponsorship details are listed after the editorial archive.",
  ];
}

function sectionLines(): string[] {
  return activeSegments().map(
    (segment) =>
      `- [${segmentDisplayName(segment)}](${absoluteUrl(`/${segment.slug}`)}): ${segment.summary} Status: ${segment.status}. Audience: ${segment.audience}.`,
  );
}

function toolsForTopic(segment: Segment, topicKey: string) {
  return listTools(segment.slug).filter((tool) => !tool.sample && toolTopicKeys(tool).includes(topicKey));
}

function toolBlocks(segment: Segment): string[] {
  return (segment.topics ?? []).flatMap((topic) => {
    const tools = toolsForTopic(segment, topic.key);
    if (tools.length === 0) return [];
    return [
      `### [${topic.label}](${absoluteUrl(topicPagePath(segment.slug, topic.key))})`,
      ...tools.map(
        (tool) =>
          `- [${tool.name}](${absoluteUrl(`/${segment.slug}/tools/${tool.slug}`)})${tool.company ? ` (${tool.company})` : ""}: ${firstSentence(tool.summary)}`,
      ),
      "",
    ];
  });
}

export function buildLlmsTxt(): string {
  const active = activeSegments();
  const lines = [
    ...identityLines(),
    "",
    "## Sections",
    ...sectionLines(),
    "",
    "## Published issues",
    ...active.flatMap((segment) =>
      listIssues(segment.slug)
        .filter((issue) => !issue.sample)
        .map(
          (issue) =>
            `- [${issue.date} ${issue.subject}](${absoluteUrl(`/${issue.segment}/issues/${issue.date}`)}): ${issue.preheader} Lead source: ${issue.lead.sourceUrl}`,
        ),
    ),
    "",
    "## Tools",
    ...active.flatMap((segment) => toolBlocks(segment)),
    "## Site",
    `- [About](${absoluteUrl("/about")})`,
    `- [Subscribe](${absoluteUrl("/subscribe")}): double opt-in. The address is not on the list until the reader confirms.`,
    `- [Privacy](${absoluteUrl("/privacy")})`,
    `- [Full briefing for models](${absoluteUrl("/llms-full.txt")})`,
    `- [Sponsor rate card](${absoluteUrl("/sponsor")}): weekly sponsorships, the Featured listing, and the founding offer.`,
    `- [Media kit](${absoluteUrl("/media-kit")}): formats and founding prices. Audience numbers are not published yet.`,
    "",
    "## Optional",
    `- [Terms](${absoluteUrl("/terms")})`,
    `- [Unsubscribe](${absoluteUrl("/unsubscribe")})`,
  ];
  return `${lines.join("\n")}\n`;
}

export function buildLlmsFullTxt(): string {
  const placementLines = launchPlacements.map((placement) => {
    const unit = placement.unit === "month" ? "month" : "week";
    return `- ${placement.name}: ${formatUsd(placement.price)} per ${unit}. Founding price ${formatUsd(placement.founding)}. ${placement.description}`;
  });

  const ladderLines = publishedPrimaryLadder().map((row) => {
    if (row.primary === null) {
      return `- ${row.label} active subscribers: primary is a quote. ${row.note}. Secondary and classified follow the rate card.`;
    }
    return `- ${row.label} active subscribers: primary ${formatUsd(row.primary)} per week. Secondary ${formatUsd(scaledFromPrimary(row.primary, secondaryRatio))}. Classified ${formatUsd(scaledFromPrimary(row.primary, classifiedRatio))}. ${row.note}.`;
  });

  const active = activeSegments();
  const archiveBlocks = active.flatMap((segment) => {
    const issues = listIssues(segment.slug).filter((issue) => !issue.sample);
    if (issues.length === 0) return [];
    return [
      `## ${segmentDisplayName(segment)} issues currently in the archive (${issues.length})`,
      ...issues.flatMap((issue) => [
        `### ${issue.date} ${issue.subject}`,
        issue.preheader,
        `Lead: ${issue.lead.title}`,
        issue.lead.summary,
        `Lead source: ${issue.lead.sourceUrl}`,
        ...(issue.lead.productUrl ? [`Product: ${issue.lead.productUrl}`] : []),
        ...issueSections(issue).flatMap((section) => [
          ...(section.topic ? [`Topic: ${section.topic}`] : []),
          ...(section.coverageNote ? [`Coverage note: ${section.coverageNote}`] : []),
          ...(section.introSourceUrl ? [`Topic source: ${section.introSourceUrl}`] : []),
          ...section.tools.map(
            (tool) => `- ${tool.name}${tool.company ? ` (${tool.company})` : ""}: ${tool.sourceUrl ?? tool.url}`,
          ),
        ]),
        `Archive: ${absoluteUrl(`/${issue.segment}/issues/${issue.date}`)}`,
        "",
      ]),
    ];
  });

  const toolLines = active.flatMap((segment) =>
    listTools(segment.slug)
      .filter((tool) => !tool.sample)
      .flatMap((tool) => {
        const payoff = getSegment(tool.segment)?.payoffLabel ?? "Why it matters";
        return [
          `### ${tool.name} (${tool.segment})`,
          tool.summary,
          `${payoff}: ${tool.whyItMatters}`,
          `Page: ${absoluteUrl(`/${tool.segment}/tools/${tool.slug}`)}`,
          `Product: ${tool.url}`,
          ...(tool.sourceUrl && tool.sourceUrl !== tool.url ? [`Source: ${tool.sourceUrl}`] : []),
          "",
        ];
      }),
  );

  return [
    ...identityLines(),
    "",
    "Open rate and audience makeup are not published yet. Do not invent them.",
    "",
    "## Sections",
    ...activeSegments().map(
      (segment) => `- ${segmentDisplayName(segment)} (${segment.status}): ${segment.summary} ${absoluteUrl(`/${segment.slug}`)}`,
    ),
    "",
    ...archiveBlocks,
    "## Tool topics",
    ...active.flatMap((segment) =>
      (segment.topics ?? []).map(
        (topic) => `- ${topic.label}: ${absoluteUrl(topicPagePath(segment.slug, topic.key))}. ${firstSentence(topic.intro)}`,
      ),
    ),
    "",
    "## Tool directory",
    ...toolLines,
    "## Launch rate card (0-2,500 subscribers in the section)",
    ...placementLines,
    "",
    "## Primary price ladder",
    "Subscriber tiers above 2,500 are not offered yet.",
    ...ladderLines,
    "",
    `Founding offer: the first ${foundingSponsorCap} sponsors, at half the launch price, locked for 3 months. They then move to the current subscriber tier with a 25% loyalty discount for 3 more months.`,
    "",
    `Newsletter sponsor cap: ${maxNewsletterSponsors}. Exclusivity premium: ${exclusivityPremium * 100}%.`,
    "",
    "## Contact",
    `Contact: ${site.email}`,
    `Sponsor inquiries: ${absoluteUrl("/sponsor")}`,
    `Media kit: ${absoluteUrl("/media-kit")}`,
    `Privacy: ${site.email}`,
    "",
  ].join("\n");
}
