import { latestPublishedIssue } from "@/lib/content";
import {
  formatUsd,
  foundingLockMonths,
  foundingSponsorCap,
  getPlacement,
} from "@/lib/rate-card";
import { absoluteUrl, editor, site } from "@/lib/site";
import { textPdf } from "@/lib/pdf";

export const audienceNumbersLine = "Audience numbers will be published after our first full month.";

export const mediaKitAudience =
  "The aviation briefing is written for airlines, MROs, parts suppliers, operators, and maintenance and AOG teams.";

export const mediaKitFounder = `${editor.name}, founder of AOG Alerts and MRO List, with a career around MROs and AOG desks, publishes Vizonix.`;

const formatIds = ["primary", "secondary", "classified", "featured"] as const;

export type MediaKitFormat = {
  id: (typeof formatIds)[number];
  name: string;
  summary: string;
  priceLabel: string;
  foundingLabel: string;
};

export function mediaKitFormats(): MediaKitFormat[] {
  return formatIds.map((id) => {
    const placement = getPlacement(id);
    if (!placement) throw new Error(`Missing placement ${id}`);
    const unit = placement.unit === "month" ? "month" : "week";
    return {
      id,
      name: placement.name,
      summary: placement.description,
      priceLabel: `${formatUsd(placement.price)} per ${unit}`,
      foundingLabel: `${formatUsd(placement.founding)} per ${unit}`,
    };
  });
}

export function mediaKitAlsoLine(): string {
  const banner = getPlacement("banner");
  const bundle = getPlacement("bundle");
  if (!banner || !bundle) return "";
  return `The rate card also lists a section site banner at ${formatUsd(banner.price)} per week (founding ${formatUsd(banner.founding)}) and a bundle at ${formatUsd(bundle.price)} per week (founding ${formatUsd(bundle.founding)}).`;
}

export function foundingOfferLine(): string {
  return `Founding pricing is half the launch price, locked for ${foundingLockMonths} months, capped at ${foundingSponsorCap} founding sponsors total across products.`;
}

export function latestIssuePath(): string | undefined {
  const issue = latestPublishedIssue("aviation");
  if (!issue || issue.sample) return undefined;
  return `/${issue.segment}/issues/${issue.date}`;
}

export function mediaKitParagraphs(): string[] {
  const latest = latestIssuePath();
  return [
    "Vizonix media kit",
    site.description,
    mediaKitAudience,
    mediaKitFounder,
    "Formats",
    ...mediaKitFormats().map(
      (format) => `${format.name}: ${format.summary} Launch price ${format.priceLabel}. Founding price ${format.foundingLabel}.`,
    ),
    mediaKitAlsoLine(),
    foundingOfferLine(),
    latest ? `Latest issue: ${absoluteUrl(latest)}` : "The latest issue is linked from the aviation archive.",
    "Placement mockups are on the media kit page. This PDF is the text version.",
    audienceNumbersLine,
  ];
}

export function mediaKitPdf(): Uint8Array {
  return textPdf(mediaKitParagraphs());
}
