export type SegmentStatus = "active" | "planned";

export type Segment = {
  slug: string;
  name: string;
  status: SegmentStatus;
  audience: string;
  summary: string;
  promise: string;
  /** Current Resend name. Audiences were renamed to Segments in November 2025. */
  resendSegmentEnv: string;
  /** Legacy alias. Used when the segment env var is unset. */
  resendAudienceEnv: string;
};

/**
 * Add a section here, then add content/{slug}/issues and content/{slug}/tools.
 * Routes, nav, sitemap, and signup all read this list.
 */
export const segments: Segment[] = [
  {
    slug: "legal",
    name: "Legal",
    status: "active",
    audience: "Lawyers and law practices",
    summary:
      "A weekday briefing on AI tools, bots, models, and resources for lawyers and law practices.",
    promise:
      "What is new, and how it could help a practice bill more, write faster, or miss less.",
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
      "This section is not publishing yet. The signup list uses the same confirmation email as Legal.",
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
    resendSegmentEnv: "RESEND_SEGMENT_ID_MARKETING_SALES",
    resendAudienceEnv: "RESEND_AUDIENCE_ID_MARKETING_SALES",
  },
];

export function getSegment(slug: string): Segment | undefined {
  return segments.find((segment) => segment.slug === slug);
}

export function segmentResendId(segment: Segment): string | undefined {
  const current = process.env[segment.resendSegmentEnv];
  if (current) return current;
  const legacy = process.env[segment.resendAudienceEnv];
  return legacy || undefined;
}
