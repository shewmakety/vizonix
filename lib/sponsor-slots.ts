/**
 * Sponsor formats the issue renderer draws.
 * Forms, the rate card, and the media kit read this list.
 * This file stays a leaf: do not import the schema, the email renderer, or the rate card.
 */

export const renderedIssueSlotIds = ["primary", "secondary"] as const;

export type RenderedIssueSlotId = (typeof renderedIssueSlotIds)[number];

/** One sponsor line on a numbered section. Bookings use the section spot id, not this id. */
export const renderedSectionFormatId = "section" as const;

export const renderedFormatIds = [...renderedIssueSlotIds, renderedSectionFormatId] as const;

export type RenderedFormatId = (typeof renderedFormatIds)[number];

/** Numbered sections in the current issue template. Spots are the same on every segment. */
export const sectionSpots = ["01", "02", "03", "04", "05", "06", "07", "08"] as const;

export type SectionSpot = (typeof sectionSpots)[number];

export const sponsorNameMax = 120;
export const sponsorCopyMax = 1200;
export const sponsorCtaMax = 80;
export const sectionLineMax = 200;

export type SponsorSlotSpec = {
  id: RenderedFormatId;
  name: string;
  /** Where the renderer places the block. */
  placement: string;
  description: string;
  /** Creative fields and the limits the schema enforces. */
  fields: string;
  targetWords: number | null;
  maxWords: number | null;
  newsletter: boolean;
  /** True when there is no published dollar price. */
  quoted: boolean;
  unit: "week";
};

export const sponsorSlotSpecs: readonly SponsorSlotSpec[] = [
  {
    id: "primary",
    name: "Primary sponsor",
    placement: "Top of the web issue and the email, before the top story.",
    description:
      "Top of every issue that week, logo plus about 100 words plus 2 calls to action, plus a permanent listing in the web archive.",
    fields:
      "Name up to 120 characters, optional logo, body up to 1,200 characters and 110 words, link, call to action up to 80 characters plus URL, and an optional second call to action up to 80 characters plus URL.",
    targetWords: 100,
    maxWords: 110,
    newsletter: true,
    quoted: false,
    unit: "week",
  },
  {
    id: "secondary",
    name: "Secondary sponsor",
    placement: "After the numbered sections, before the toolbox.",
    description: "After the numbered sections, about 50 words and 1 call to action.",
    fields:
      "Name up to 120 characters, optional logo, body up to 1,200 characters and 60 words, link, and a call to action up to 80 characters plus URL. A second call to action is optional.",
    targetWords: 50,
    maxWords: 60,
    newsletter: true,
    quoted: false,
    unit: "week",
  },
  {
    id: "section",
    name: "Section sponsor",
    placement: "At the top of one numbered section in the web issue and the email.",
    description:
      "A short line at the top of one numbered section. An open section shows Sponsor this section - Open.",
    fields: "Name up to 120 characters, line up to 200 characters, link, and an optional logo. No call-to-action button.",
    targetWords: null,
    maxWords: null,
    newsletter: true,
    quoted: true,
    unit: "week",
  },
];

const sectionSpotSet = new Set<string>(sectionSpots);

export function sponsorSlotSpec(id: string): SponsorSlotSpec | undefined {
  return sponsorSlotSpecs.find((spec) => spec.id === id);
}

export function isSectionSpot(id: string): id is SectionSpot {
  return sectionSpotSet.has(id);
}

/** Primary and secondary stay themselves. A section spot such as 01 maps to the section format. */
export function formatForPlacement(id: string): RenderedFormatId | undefined {
  if (id === "primary" || id === "secondary" || id === renderedSectionFormatId) return id;
  if (isSectionSpot(id)) return renderedSectionFormatId;
  return undefined;
}
