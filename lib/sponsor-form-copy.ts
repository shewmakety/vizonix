import {
  exclusivityPremium,
  foundingLockMonths,
  foundingSponsorCap,
} from "@/lib/rate-card";

export const sponsorRequiredLegend =
  "Fields marked Required have to be filled in. Optional fields can be left blank.";

export const sponsorVerifyHelp =
  "If a check appears, complete it before sending. A missing or invalid check is rejected.";

export const sponsorContactLead = "You can also email";

export function sponsorContactNote(email: string): string {
  return `${sponsorContactLead} ${email}.`;
}

export type InquiryFieldName = "name" | "company" | "email" | "promote" | "budget" | "message";

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
    label: "Company",
    required: true,
    help: "The business that would sponsor the briefing.",
  },
  email: {
    label: "Email",
    required: true,
    help: "Where we send the reply. Use an address you check.",
  },
  promote: {
    label: "What do you want to promote?",
    required: true,
    help: "The product, service, or offer you want readers to see.",
  },
  budget: {
    label: "Budget",
    required: false,
    help: "A rough monthly range. Leave this on Select a range if you are not sure yet.",
  },
  message: {
    label: "Message",
    required: true,
    help: "Your question, plus dates or a section if you already have them in mind.",
  },
};

export const inquiryPlacementLabel = "Placement";

export const inquiryPlacementHelp =
  "Primary and secondary have a listed weekly price. A numbered section is quoted.";

export const inquirySegmentLabel = "Section";

export function checkoutSegmentHelp(sectionNames: readonly string[]): string {
  return `The briefing this sponsorship runs in. Live sections: ${formatNameList(sectionNames)}.`;
}

export const checkoutPlacementHelp =
  "A newsletter placement. The week starts on Monday and runs Monday through Friday.";

export const checkoutStartHelp =
  "The Monday the week starts. Pick today or a later Monday within the next year.";

export const checkoutQuantityHelp =
  "How many weeks to reserve. Enter a whole number from 1 to 12.";

export const checkoutCompanyHelp =
  "The name to put on the receipt. Leave this blank if you do not need it.";

export const checkoutEmailHelp =
  "Where Stripe sends the receipt. Use an address you check.";

export const checkoutAdCopyLabel = "Link to ad copy";

export const checkoutAdCopyHelp =
  "A link to the copy or page you want used. Leave this blank if you will send it later. Start with https://.";

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
  "A numbered section sponsor is quoted. Use the inquiry form for that.";

function formatNameList(names: readonly string[]): string {
  if (names.length === 0) return "none open yet";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}
