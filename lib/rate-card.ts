import {
  renderedIssueSlotIds,
  sponsorSlotSpecs,
  type RenderedFormatId,
} from "@/lib/sponsor-slots";

/** Placements checkout can charge. Section spots are quoted and are not in this list. */
export const placements = renderedIssueSlotIds;

export type Placement = (typeof placements)[number];

export type LaunchPlacement = {
  id: RenderedFormatId;
  name: string;
  description: string;
  /** Null when the slot is quoted and has no published price. */
  price: number | null;
  founding: number | null;
  unit: "week";
  targetWords: number | null;
  maxWords: number | null;
  newsletter: boolean;
  quoted: boolean;
};

/**
 * Launch stage, 0-2,500 subscribers. Weekly figures are the Vizonix rate card
 * (draft, Oct 14 2026) for the slots the issue still renders. Do not invent a
 * different number in page copy. The section sponsor has no published price.
 */
const publishedPrices: Record<RenderedFormatId, { price: number | null; founding: number | null }> = {
  primary: { price: 300, founding: 150 },
  secondary: { price: 175, founding: 90 },
  section: { price: null, founding: null },
};

export const launchPlacements: LaunchPlacement[] = sponsorSlotSpecs.map((spec) => ({
  id: spec.id,
  name: spec.name,
  description: spec.description,
  price: publishedPrices[spec.id].price,
  founding: publishedPrices[spec.id].founding,
  unit: spec.unit,
  targetWords: spec.targetWords,
  maxWords: spec.maxWords,
  newsletter: spec.newsletter,
  quoted: spec.quoted,
}));

export const checkoutPlacements = launchPlacements.filter(
  (placement): placement is LaunchPlacement & { price: number; founding: number } =>
    placement.price != null && placement.founding != null,
);

function placementPrice(id: "primary" | "secondary"): number {
  const placement = launchPlacements.find((item) => item.id === id);
  if (placement?.price == null) throw new Error(`Missing rate card placement: ${id}`);
  return placement.price;
}

/** Secondary follows the launch rate card, not a rounded percent. */
export const secondaryRatio = placementPrice("secondary") / placementPrice("primary");
export const exclusivityPremium = 0.5;
export const foundingSponsorCap = 10;
export const foundingLockMonths = 3;
export const loyaltyDiscount = 0.25;
export const loyaltyMonths = 3;

export type LadderRow = {
  label: string;
  primary: number | null;
  note: string;
};

/** Primary slot, weekly. Other newsletter slots scale from the launch rate card. */
export const primaryLadder: LadderRow[] = [
  { label: "0-1,000", primary: 300, note: "Floor" },
  { label: "1,000-2,500", primary: 400, note: "About $32-$80 per 1,000 subs per issue" },
  { label: "2,500-5,000", primary: 750, note: "About $30-$60 per 1,000 subs per issue" },
  { label: "5,000-10,000", primary: 1250, note: "About $25-$50 per 1,000 subs per issue" },
  { label: "10,000-25,000", primary: 2500, note: "About $20-$50 per 1,000 subs per issue" },
  { label: "25,000-50,000", primary: 4500, note: "About $18-$36 per 1,000 subs per issue" },
  {
    label: "50,000+",
    primary: null,
    note: "Quote, about $15-$20 per 1,000 subs per issue",
  },
];

/**
 * Bands that start at this many subscribers stay off the public page and llms.txt.
 * The full ladder remains in code for when those tiers open.
 */
export const publishedSubscriberCeiling = 2500;

export function publishedPrimaryLadder(): LadderRow[] {
  return primaryLadder.filter((row) => {
    const start = Number(row.label.replace(/,/g, "").split(/[-+]/)[0]);
    return Number.isFinite(start) && start < publishedSubscriberCeiling;
  });
}

export function scaledFromPrimary(primary: number, ratio: number): number {
  return Math.round(primary * ratio);
}

export function getPlacement(id: string): LaunchPlacement | undefined {
  return launchPlacements.find((placement) => placement.id === id);
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function priceLabel(amount: number | null, unit: "week" | "month"): string {
  if (amount == null) return "Quote";
  return unit === "month" ? `${formatUsd(amount)} / month` : formatUsd(amount);
}

export function stripePriceEnvKey(
  segment: string,
  placement: string,
  founding: boolean,
): string {
  const seg = segment.toUpperCase().replace(/-/g, "_");
  const place = placement.toUpperCase().replace(/-/g, "_");
  return `STRIPE_PRICE_${seg}_${place}${founding ? "_FOUNDING" : ""}`;
}

export function stripeLinkEnvKey(segment: string, placement: string): string {
  const seg = segment.toUpperCase().replace(/-/g, "_");
  const place = placement.toUpperCase().replace(/-/g, "_");
  return `NEXT_PUBLIC_STRIPE_LINK_${seg}_${place}`;
}

export function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}
