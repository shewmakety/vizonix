import { z } from "zod";
import { getSegment } from "@/lib/segments";
import { isBookingPlacement } from "@/lib/sponsor-placements";

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
  company: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(200),
  promote: z.string().trim().min(1).max(300),
  budget: z.string().trim().max(80).optional(),
  message: z.string().trim().min(1).max(4000),
});

export type SponsorInquiry = {
  name: string;
  company: string;
  email: string;
  promote: string;
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
    promote: body.promote,
    budget: body.budget ? String(body.budget) : undefined,
    message: body.message,
  });
  if (!parsed.success) {
    return { ok: false, error: "Check the name, company, email, what you want to promote, and message." };
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
  const placement = String(body.placement ?? "").trim();
  if (!isBookingPlacement(placement)) return { ok: false, error: "Choose a placement." };

  return {
    ok: true,
    value: {
      name: parsed.data.name,
      company: parsed.data.company,
      email: parsed.data.email.trim().toLowerCase(),
      promote: parsed.data.promote,
      budget,
      message: parsed.data.message,
      segment: segment.slug,
      placement,
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
