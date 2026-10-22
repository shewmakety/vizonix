import { latestPublishedIssue } from "@/lib/content";
import {
  formatUsd,
  foundingLockMonths,
  foundingSponsorCap,
  launchPlacements,
} from "@/lib/rate-card";
import { featuredSegment } from "@/lib/segments";
import { absoluteUrl, editor, site } from "@/lib/site";
import { sponsorSlotSpec } from "@/lib/sponsor-slots";
import { textPdf } from "@/lib/pdf";

export const audienceNumbersLine = "Audience numbers will be published after our first full month.";

const launch = featuredSegment();

export const mediaKitAudience = `The ${launch.name.toLowerCase()} briefing is written for ${launch.audience}.`;

export const mediaKitFounder = `${editor.name}, founder of AOG Alerts and MRO List, with a career around MROs and AOG desks, publishes Vizonix.`;

export type MediaKitFormat = {
  id: string;
  name: string;
  summary: string;
  fields: string;
  placement: string;
  priceLabel: string;
  foundingLabel: string;
  quoted: boolean;
};

export function mediaKitFormats(): MediaKitFormat[] {
  return launchPlacements.map((placement) => {
    const spec = sponsorSlotSpec(placement.id);
    return {
      id: placement.id,
      name: placement.name,
      summary: placement.description,
      fields: spec?.fields ?? "",
      placement: spec?.placement ?? "",
      priceLabel: placement.price == null ? "Quote" : `${formatUsd(placement.price)} per week`,
      foundingLabel: placement.founding == null ? "Quote" : `${formatUsd(placement.founding)} per week`,
      quoted: placement.quoted,
    };
  });
}

export function foundingOfferLine(): string {
  return `Founding pricing is half the launch price, locked for ${foundingLockMonths} months, capped at ${foundingSponsorCap} founding sponsors total across products. It applies to primary and secondary. Section sponsors are quoted.`;
}

export function latestIssuePath(): string | undefined {
  const issue = latestPublishedIssue(featuredSegment().slug);
  if (!issue || issue.sample) return undefined;
  return `/${issue.segment}/issues/${issue.date}`;
}

function formatLine(format: MediaKitFormat): string {
  if (format.quoted) {
    return `${format.name}: ${format.placement} ${format.summary} ${format.fields} Price: Quote.`;
  }
  return `${format.name}: ${format.placement} ${format.summary} ${format.fields} Launch price ${format.priceLabel}. Founding price ${format.foundingLabel}.`;
}

export function mediaKitParagraphs(): string[] {
  const latest = latestIssuePath();
  return [
    "Vizonix media kit",
    site.description,
    mediaKitAudience,
    mediaKitFounder,
    "Formats",
    ...mediaKitFormats().map(formatLine),
    foundingOfferLine(),
    latest ? `Latest issue: ${absoluteUrl(latest)}` : "The latest issue is linked from the archive.",
    "Placement mockups are on the media kit page. This PDF is the text version.",
    audienceNumbersLine,
  ];
}

export function mediaKitPdf(): Uint8Array {
  return textPdf(mediaKitParagraphs());
}
