import {
  exclusivityPremium,
  foundingLockMonths,
  foundingSponsorCap,
} from "@/lib/rate-card";
import {
  buyerCopyMax,
  buyerWordMax,
  sponsorNameMax,
  type RenderedFormatId,
} from "@/lib/sponsor-slots";

export const sponsorRequiredLegend =
  "Fields marked Required have to be filled in. Optional fields can be left blank.";

export const sponsorHumanLabel = "Confirm you're human";

export const sponsorVerifyHelp = "Stops spam. Completes automatically for most people.";

export const sponsorHumanPending = "The human check is still loading. Try again.";

export const sponsorContactLead = "You can also email";

export function sponsorContactNote(email: string): string {
  return `${sponsorContactLead} ${email}.`;
}

export type InquiryFieldName = "name" | "company" | "email" | "budget" | "message";

export type InquiryFieldCopy = {
  label: string;
  required: boolean;
  help: string;
};

/** Required flags match parseInquiry. Budget may be omitted. Segment and placement are required too. */
export const inquiryFieldCopy: Record<InquiryFieldName, InquiryFieldCopy> = {
  name: {
    label: "Name",
    required: true,
    help: "Your name, so we know who to reply to.",
  },
  company: {
    label: "Company name",
    required: true,
    help: companyNameHelp(),
  },
  email: {
    label: "Email",
    required: true,
    help: "Where we send the reply. Use an address you check.",
  },
  budget: {
    label: "Budget",
    required: false,
    help: "A rough monthly range. Leave this on Select a range if you are not sure yet.",
  },
  message: {
    label: "Message",
    required: true,
    help: "Your question, plus dates if you already have them in mind.",
  },
};

export const inquiryPlacementLabel = "Placement";

export const inquiryPlacementHelp =
  "Primary sponsor, secondary sponsor, or section sponsor. A section sponsor also needs the numbered section.";

export const sponsoredSectionLabel = "Sponsored section";

export const sponsoredSectionHelp =
  "The numbered section this sponsorship runs on. The list is the current issue of the briefing you picked.";

export const inquirySegmentLabel = "Section";

export function checkoutSegmentHelp(sectionNames: readonly string[]): string {
  return `The briefing this sponsorship runs in. Live sections: ${formatNameList(sectionNames)}.`;
}

export const checkoutPlacementHelp =
  "Primary sponsor, secondary sponsor, or section sponsor. A week starts on Monday and runs Monday through Friday. A section sponsor also needs the numbered section.";

export const checkoutStartHelp =
  "The Monday the week starts. Pick today or a later Monday within the next year.";

export const checkoutQuantityHelp =
  "How many weeks to reserve. Enter a whole number from 1 to 12.";

export function companyNameHelp(): string {
  return `The company name that runs in the ad. Up to ${sponsorNameMax} characters.`;
}

export const checkoutCompanyHelp = companyNameHelp();

export const checkoutEmailHelp =
  "Where Stripe sends the receipt. Use an address you check.";

export const checkoutAdCopyLabel = "Ad copy";

function groupedCount(value: number): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** Character ceiling, plus the word ceiling when the slot has one. */
export function adCopyLimitText(format: RenderedFormatId): string {
  const characters = `Up to ${groupedCount(buyerCopyMax(format))} characters`;
  const words = buyerWordMax(format);
  return words == null ? `${characters}.` : `${characters} and ${words} words.`;
}

export function checkoutAdCopyHelp(format: RenderedFormatId): string {
  return `The ad copy that runs with the company name. ${adCopyLimitText(format)}`;
}

export const checkoutFoundingLabel = "Request the founding rate";

export function checkoutFoundingHelp(pricePerUnit: string): string {
  return `Half off the listed price, locked for ${foundingLockMonths} months, for the first ${foundingSponsorCap} sponsors across products. Checkout applies ${pricePerUnit}. It does not combine with another discount.`;
}

export const checkoutExclusivityLabel = "Request exclusivity for that week";

export function checkoutExclusivityHelp(): string {
  const percent = exclusivityPremium * 100;
  return `The only sponsor that week, at ${percent}% above the listed price. Checkout charges the listed price. We confirm the surcharge by email before the week is marked exclusive.`;
}

export const checkoutSectionQuoteNote =
  "A section sponsor is quoted. Choose the numbered section, then send the inquiry form. Checkout will not charge this placement.";

/** Checkout hands a section sponsor to the inquiry form on the same page. */
export const sponsorInquiryPrefillEvent = "vizonix-sponsor-inquiry-prefill";

export type SponsorInquiryPrefill = {
  placement: "section";
  segment: string;
  section: string;
  company: string;
  adCopy: string;
};

function formatNameList(names: readonly string[]): string {
  if (names.length === 0) return "none open yet";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
