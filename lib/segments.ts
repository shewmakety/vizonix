export type SegmentStatus = "active" | "planned";

export type Segment = {
  slug: string;
  name: string;
  status: SegmentStatus;
  audience: string;
  summary: string;
  promise: string;
  /** Label in front of the "why this changes the money" line. No trailing period. */
  payoffLabel: string;
  /** Current Resend name. Audiences were renamed to Segments in November 2025. */
  resendSegmentEnv: string;
  /** Legacy alias. Used when the segment env var is unset. */
  resendAudienceEnv: string;
};

/**
 * Order is the order in the nav and on the home page.
 * The first status "active" entry is the featured launch section.
 * Add a section here, then add content/{slug}/issues and content/{slug}/tools.
 * Routes, nav, sitemap, signup, and sponsor checkout all read this list.
 */
export const segments: Segment[] = [
  {
    slug: "aviation",
    name: "Aviation",
    status: "active",
    audience: "Airlines, MROs, parts suppliers, operators, and maintenance / AOG teams",
    summary:
      "A weekday briefing on AI tools, bots, models, and resources for airlines, MROs, parts suppliers, operators, and maintenance / AOG teams.",
    promise:
      "What is new, and how it could put an aircraft back in service sooner, fill a bay, or cut a premium parts buy.",
    payoffLabel: "Why it can make the operation money",
    resendSegmentEnv: "RESEND_SEGMENT_ID_AVIATION",
    resendAudienceEnv: "RESEND_AUDIENCE_ID_AVIATION",
  },
  {
    slug: "legal",
    name: "Legal",
    status: "active",
    audience: "Lawyers and law practices",
    summary:
      "A weekday briefing on AI tools, bots, models, and resources for lawyers and law practices.",
    promise:
      "What is new, and how it could help a practice bill more, write faster, or miss less.",
    payoffLabel: "Why it can make the practice money",
    resendSegmentEnv: "RESEND_SEGMENT_ID_LEGAL",
    resendAudienceEnv: "RESEND_AUDIENCE_ID_LEGAL",
  },
  {
    slug: "warehousing",
    name: "Warehousing",
    status: "planned",
    audience: "Warehouse and fulfillment operators",
    summary:
      "AI tools that help a warehouse move more goods with fewer errors and less wasted labor.",
    promise:
      "This section is not publishing yet. The signup list uses the same confirmation email as the live sections.",
    payoffLabel: "Why it can make the warehouse money",
    resendSegmentEnv: "RESEND_SEGMENT_ID_WAREHOUSING",
    resendAudienceEnv: "RESEND_AUDIENCE_ID_WAREHOUSING",
  },
  {
    slug: "marketing-sales",
    name: "Marketing and sales",
    status: "planned",
    audience: "Marketing and sales teams",
    summary:
      "AI tools that help a team find demand, convert it, and keep the customer.",
    promise:
      "This section is not publishing yet. Leave an address if you want the first issue.",
    payoffLabel: "Why it can make the team money",
    resendSegmentEnv: "RESEND_SEGMENT_ID_MARKETING_SALES",
    resendAudienceEnv: "RESEND_AUDIENCE_ID_MARKETING_SALES",
  },
];

export function getSegment(slug: string): Segment | undefined {
  return segments.find((segment) => segment.slug === slug);
}

/** First active section. Home, signup, and the launch newsletter use this. */
export function featuredSegment(): Segment {
  return segments.find((segment) => segment.status === "active") ?? segments[0];
}

export function segmentResendId(segment: Segment): string | undefined {
  const current = process.env[segment.resendSegmentEnv];
  if (current) return current;
  const legacy = process.env[segment.resendAudienceEnv];
  return legacy || undefined;
}
