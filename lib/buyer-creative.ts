import {
  buyerCopyMax,
  buyerWordMax,
  sponsorNameMax,
  type RenderedFormatId,
} from "@/lib/sponsor-slots";

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/** Slot-specific ad copy check. Empty copy fails. Company name is checked separately. */
export function adCopyError(format: RenderedFormatId, adCopy: string): string | null {
  const copy = adCopy.trim();
  if (!copy) return "Enter the ad copy.";
  const max = buyerCopyMax(format);
  if (copy.length > max) return `Ad copy must be ${max} characters or fewer.`;
  const words = buyerWordMax(format);
  if (words != null && wordCount(copy) > words) {
    return `Ad copy must be ${words} words or fewer.`;
  }
  return null;
}

/** Public buyer creative: company name and ad copy, with the slot ceilings. */
export function validateBuyerCreative(
  format: RenderedFormatId,
  company: string,
  adCopy: string,
): string | null {
  const name = company.trim();
  if (!name) return "Enter the company name.";
  if (name.length > sponsorNameMax) {
    return `Company name must be ${sponsorNameMax} characters or fewer.`;
  }
  return adCopyError(format, adCopy);
}
