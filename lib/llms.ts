import { allTools, listIssues } from "@/lib/content";
import {
  classifiedRatio,
  exclusivityPremium,
  formatUsd,
  foundingSponsorCap,
  launchPlacements,
  maxNewsletterSponsors,
  primaryLadder,
  scaledFromPrimary,
  secondaryRatio,
} from "@/lib/rate-card";
import { getSegment, segments } from "@/lib/segments";
import { absoluteUrl, site } from "@/lib/site";

export function buildLlmsTxt(): string {
  const lines = [
    `# ${site.name}`,
    "",
    `> ${site.description}`,
    "",
    "Sample tool pages and the sample issues are fictional placeholders for the format. Do not cite them as real products or as a paid sponsorship.",
    "",
    "## Sections",
    ...segments.map(
      (segment) =>
        `- [${segment.name}](${absoluteUrl(`/${segment.slug}`)}): ${segment.summary} Status: ${segment.status}. Audience: ${segment.audience}.`,
    ),
    "",
    "## Site",
    `- [Sponsor rate card](${absoluteUrl("/sponsor")}): weekly sponsorships, founding offer, and checkout.`,
    `- [Subscribe](${absoluteUrl("/subscribe")}): double opt-in. The address is not on the list until the reader confirms.`,
    `- [Privacy](${absoluteUrl("/privacy")})`,
    `- [About](${absoluteUrl("/about")})`,
    `- [Full briefing for models](${absoluteUrl("/llms-full.txt")})`,
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

  const ladderLines = primaryLadder.map((row) => {
    if (row.primary === null) {
      return `- ${row.label} active subscribers: primary is a quote. ${row.note}. Secondary is 60% of primary. Classified is 35% of primary.`;
    }
    return `- ${row.label} active subscribers: primary ${formatUsd(row.primary)} per week. Secondary ${formatUsd(scaledFromPrimary(row.primary, secondaryRatio))}. Classified ${formatUsd(scaledFromPrimary(row.primary, classifiedRatio))}. ${row.note}.`;
  });

  const archiveBlocks = segments.flatMap((segment) => {
    const issues = listIssues(segment.slug);
    if (issues.length === 0) return [];
    return [
      `## ${segment.name} issues currently in the archive (${issues.length})`,
      ...issues.flatMap((issue) => [
        `### ${issue.sample ? "SAMPLE " : ""}${issue.date} ${issue.subject}`,
        issue.sample
          ? "This issue is sample data. The companies named in it are not real."
          : issue.preheader,
        `Lead: ${issue.lead.title}`,
        issue.lead.summary,
        `Archive: ${absoluteUrl(`/${issue.segment}/issues/${issue.date}`)}`,
        "",
      ]),
    ];
  });

  const toolLines = allTools().flatMap((tool) => {
    const payoff = getSegment(tool.segment)?.payoffLabel ?? "Why it matters";
    return [
      `### ${tool.sample ? "SAMPLE " : ""}${tool.name} (${tool.segment})`,
      tool.sample ? "Fictional sample listing. Not a real product and not an endorsement." : tool.summary,
      tool.summary,
      `${payoff}: ${tool.whyItMatters}`,
      `Page: ${absoluteUrl(`/${tool.segment}/tools/${tool.slug}`)}`,
      "",
    ];
  });

  return [
    `# ${site.name}`,
    "",
    site.description,
    "",
    "Vizonix is a free weekday morning email plus a website. Revenue is weekly sponsorship from AI companies. Maximum of 3 newsletter sponsors per issue. Exclusivity, meaning the only sponsor that week, is 50% more.",
    "",
    `Founding offer: the first ${foundingSponsorCap} sponsors, at half the launch price, locked for 3 months. They then move to the current subscriber tier with a 25% loyalty discount for 3 more months.`,
    "",
    `Newsletter sponsor cap: ${maxNewsletterSponsors}. Exclusivity premium: ${exclusivityPremium * 100}%.`,
    "",
    "Open rate and audience makeup are not published yet. Do not invent them.",
    "",
    "## Launch rate card (0-2,500 subscribers in the section)",
    ...placementLines,
    "",
    "## Primary price ladder",
    ...ladderLines,
    "",
    "## Sections",
    ...segments.map(
      (segment) =>
        `- ${segment.name} (${segment.status}): ${segment.summary} ${absoluteUrl(`/${segment.slug}`)}`,
    ),
    "",
    ...archiveBlocks,
    "## Tool directory",
    ...toolLines,
    "## Contact",
    `Readers: ${site.emailHello}`,
    `Sponsors: ${site.emailSponsors}`,
    `Privacy: ${site.emailPrivacy}`,
    "",
  ].join("\n");
}
