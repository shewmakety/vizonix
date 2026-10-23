import { z } from "zod";
import { validateBuyerCreative } from "@/lib/buyer-creative";
import { getSegment } from "@/lib/segments";
import { numberedSectionIds } from "@/lib/sponsor-labels";
import { resolvePublicPlacement } from "@/lib/sponsor-placements";

export const inquiryBudgets = [
  "Not sure",
  "Under $150 a month",
  "$150 to $300",
  "$300 to $750",
  "$750 or more",
] as const;

const windowMs = 60 * 60 * 1000;
const maxHits = 5;
const hits = new Map<string, number[]>();

const inquirySchema = z.object({
  name: z.string().trim().min(1).max(120),
  company: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(200),
  adCopy: z.string().trim().min(1).max(4000),
  budget: z.string().trim().max(80).optional(),
  message: z.string().trim().min(1).max(4000),
});

export type SponsorInquiry = {
  name: string;
  company: string;
  email: string;
  promote: string;
  adCopy: string;
  budget: string;
  message: string;
  segment: string;
  placement: string;
  honeypot: boolean;
};

function asRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

export function parseInquiry(
  raw: unknown,
): { ok: true; value: SponsorInquiry } | { ok: false; error: string } {
  const body = asRecord(raw);
  const honeypot = String(body.company_website ?? body.companyWebsite ?? "").trim();
  if (honeypot) {
    return {
      ok: true,
      value: {
        name: "",
        company: "",
        email: "hidden@example.com",
        promote: "",
        adCopy: "",
        budget: "",
        message: "",
        segment: "",
        placement: "",
        honeypot: true,
      },
    };
  }

  const parsed = inquirySchema.safeParse({
    name: body.name,
    company: body.company,
    email: body.email,
    adCopy: body.adCopy,
    budget: body.budget ? String(body.budget) : undefined,
    message: body.message,
  });
  if (!parsed.success) {
    return { ok: false, error: "Check the name, company name, email, ad copy, and message." };
  }
  const budget = parsed.data.budget ?? "";
  if (budget && !inquiryBudgets.includes(budget as (typeof inquiryBudgets)[number])) {
    return { ok: false, error: "Choose a budget from the list, or leave it blank." };
  }

  const segmentSlug = String(body.segment ?? "").trim();
  const segment = getSegment(segmentSlug);
  if (!segment) return { ok: false, error: "Choose a section." };
  if (segment.status !== "active") {
    return { ok: false, error: "That section is not open for sponsorship yet." };
  }
  const resolved = resolvePublicPlacement(
    String(body.placement ?? ""),
    String(body.section ?? ""),
    numberedSectionIds(segment.slug),
  );
  if (!resolved.ok) return resolved;
  const creative = validateBuyerCreative(resolved.value.format, parsed.data.company, parsed.data.adCopy);
  if (creative) return { ok: false, error: creative };

  return {
    ok: true,
    value: {
      name: parsed.data.name,
      company: parsed.data.company,
      email: parsed.data.email.trim().toLowerCase(),
      promote: parsed.data.adCopy.slice(0, 300),
      adCopy: parsed.data.adCopy,
      budget,
      message: parsed.data.message,
      segment: segment.slug,
      placement: resolved.value.placement,
      honeypot: false,
    },
  };
}

/** Best-effort limit for this server instance. The inquiry route also checks Turnstile. */
export function allowInquiry(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((time) => now - time < windowMs);
  if (recent.length >= maxHits) {
    hits.set(ip, recent);
    return false;
  }
  recent.push(now);
  hits.set(ip, recent);
  return true;
}

export function resetInquiryLimits(): void {
  hits.clear();
}

export function inquiryClientKey(header: string | null): string {
  const first = header?.split(",")[0]?.trim();
  return first || "unknown";
}
