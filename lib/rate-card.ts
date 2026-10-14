export const placements = [
  "primary",
  "secondary",
  "classified",
  "banner",
  "featured",
  "bundle",
] as const;

export type Placement = (typeof placements)[number];

export type LaunchPlacement = {
  id: Placement;
  name: string;
  description: string;
  /** Weekly price in USD, except featured, which is monthly. */
  price: number;
  founding: number;
  unit: "week" | "month";
  /** Target length for newsletter copy. Non-newsletter placements stay blank. */
  targetWords: number | null;
  /** Hard ceiling enforced when an issue is published. */
  maxWords: number | null;
  newsletter: boolean;
};

/**
 * Launch stage, 0-2,500 subscribers. Figures are the Vizonix rate card
 * (draft, Oct 14 2026). Do not invent a different number in page copy.
 */
export const launchPlacements: LaunchPlacement[] = [
  {
    id: "primary",
    name: "Primary sponsor",
    description:
      "Top of every issue that week, logo plus about 100 words plus 2 calls to action, plus a permanent listing in the web archive.",
    price: 300,
    founding: 150,
    unit: "week",
    targetWords: 100,
    maxWords: 110,
    newsletter: true,
  },
  {
    id: "secondary",
    name: "Secondary",
    description: "Mid-issue, about 50 words, 1 call to action.",
    price: 175,
    founding: 90,
    unit: "week",
    targetWords: 50,
    maxWords: 60,
    newsletter: true,
  },
  {
    id: "classified",
    name: "Classified / Quick link",
    description: "Bottom of the issue, about 25 words, 1 link.",
    price: 100,
    founding: 50,
    unit: "week",
    targetWords: 25,
    maxWords: 35,
    newsletter: true,
  },
  {
    id: "banner",
    name: "Section site banner",
    description: "Banner on vizonix.com/legal and its article pages for 7 days.",
    price: 100,
    founding: 50,
    unit: "week",
    targetWords: null,
    maxWords: null,
    newsletter: false,
  },
  {
    id: "featured",
    name: "Featured tool listing",
    description: "Sponsored card in the section tool directory for 30 days.",
    price: 150,
    founding: 75,
    unit: "month",
    targetWords: null,
    maxWords: null,
    newsletter: false,
  },
  {
    id: "bundle",
    name: "Bundle",
    description:
      "Primary plus site banner plus featured listing plus one X post. Saves about 20% against buying those pieces separately.",
    price: 500,
    founding: 250,
    unit: "week",
    targetWords: 100,
    maxWords: 110,
    newsletter: true,
  },
];

export const secondaryRatio = 0.6;
export const classifiedRatio = 0.35;
export const exclusivityPremium = 0.5;
export const maxNewsletterSponsors = 3;
export const foundingSponsorCap = 10;
export const foundingLockMonths = 3;
export const loyaltyDiscount = 0.25;
export const loyaltyMonths = 3;

export type LadderRow = {
  label: string;
  primary: number | null;
  note: string;
};

/** Primary slot, weekly. Other newsletter slots scale by the ratios above. */
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
