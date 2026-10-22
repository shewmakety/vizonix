import { capDescription } from "@/lib/meta";

export type SegmentStatus = "active" | "planned";

export type SegmentTopic = {
  /** URL and tool key, for example predictive-maintenance. */
  key: string;
  /** Chip label. */
  label: string;
  /** Lowercase phrase used in the topic page heading. */
  phrase: string;
  /** Full heading when the phrase template would read awkwardly. */
  heading?: string;
  /** Two or three sentences under the topic page heading. */
  intro: string;
  /**
   * Issue section topic this key belongs to.
   * Aviation keys follow the Oct 16 issue sections so directory tools map onto those groups.
   */
  issueTopic?: string;
};

export type Segment = {
  slug: string;
  /** Short label for compact lines such as the date line and archive crumbs. */
  name: string;
  /** Public edition name. Page titles and the email footer use this. */
  displayName?: string;
  /**
   * Words in front of the edition name in the site header only.
   * Aviation uses "Customizable". The footer keeps displayName.
   */
  headerPrefix?: string;
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
  /**
   * Directory topics. Omit when the section is not grouping tools yet.
   * The general-ai topic reuses content/general-ai/tools on any section that lists it.
   */
  topics?: SegmentTopic[];
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
    displayName: "AI & Robotics News For Aviation",
    headerPrefix: "Customizable",
    status: "active",
    audience: "Airlines, MROs, parts suppliers, operators, and maintenance / AOG teams",
    summary:
      "A weekday briefing on AI and robotics for airlines, MROs, parts suppliers, operators, and maintenance / AOG teams.",
    promise:
      "What is new, and how it could put an aircraft back in service sooner, fill a bay, or cut a premium parts buy.",
    payoffLabel: "Why it can make you money",
    resendSegmentEnv: "RESEND_SEGMENT_ID_AVIATION",
    resendAudienceEnv: "RESEND_AUDIENCE_ID_AVIATION",
    topics: [
      {
        key: "recruiting-pilots-and-technicians",
        label: "Recruiting",
        phrase: "recruiting",
        intro:
          "These listings cover software that helps an airline, MRO, or repair station hire pilots and technicians. The group includes applicant tracking, skills matching, and interview tools aimed at aviation roles.",
        issueTopic: "Recruiting",
      },
      {
        key: "sales-and-marketing",
        label: "Sales & Marketing",
        phrase: "sales and marketing",
        intro:
          "These listings cover software for charter sales, parts pricing, and customer outreach in aviation. The group is for teams that quote work, price inventory, or market capacity.",
        issueTopic: "Sales and marketing",
      },
      {
        key: "predictive-maintenance",
        label: "Predictive Maintenance",
        phrase: "predictive maintenance",
        intro:
          "These listings cover software that flags repeat defects, engine risk, and other maintenance patterns before the next removal. The group is for reliability and maintenance-control teams.",
        issueTopic: "Predictive maintenance",
      },
      {
        key: "maintenance-optimization",
        label: "Maintenance Optimization",
        phrase: "maintenance optimization",
        intro:
          "These listings cover software that plans maintenance around labor, parts, and station limits. The group is for planning desks that schedule checks and shop visits.",
        issueTopic: "Maintenance activity optimization",
      },
      {
        key: "troubleshooting",
        label: "Troubleshooting",
        phrase: "troubleshooting",
        intro:
          "These listings cover software that answers questions from approved technical documents. The group is for technicians and engineers who need a source they can check.",
        issueTopic: "Troubleshooting support",
      },
      {
        key: "warehousing-and-inventory",
        label: "Warehousing & Inventory",
        phrase: "warehousing and inventory",
        intro:
          "These listings cover software for counting and tracking parts in aviation stores. The group is for stockrooms, warehouses, and inventory desks.",
        issueTopic: "Warehousing",
      },
      {
        key: "aog-support",
        label: "AOG Support",
        phrase: "AOG support",
        intro:
          "These listings cover software for sourcing parts when an aircraft is on the ground. The group includes rotables, surplus, and technician support used in an AOG event.",
        issueTopic: "AOG support: parts, rotables and technicians",
      },
      {
        key: "records-and-documentation",
        label: "Records & Documentation",
        phrase: "records and documentation",
        intro:
          "These listings cover software for aircraft records, logbooks, and parts trace. The group is for records teams that have to show where a part came from.",
      },
      {
        key: "flight-operations",
        label: "Flight Operations",
        phrase: "flight operations",
        intro:
          "These listings cover software for crew planning, fuel, and turnaround work. The group is for operations desks that move the day's flights.",
      },
      {
        key: "general-ai",
        label: "General AI",
        phrase: "general-purpose assistants",
        heading: "General AI assistants for aviation teams",
        intro:
          "These listings are mainstream assistants and everyday AI tools a business user can open in a browser, including ChatGPT, Claude, and Gemini. They are not aviation-specific products.",
      },
    ],
  },
];

export function getSegment(slug: string): Segment | undefined {
  return segments.find((segment) => segment.slug === slug);
}

/** Edition name shown to readers. Falls back to the short name when unset. */
export function segmentDisplayName(segment: Pick<Segment, "name" | "displayName">): string {
  return segment.displayName ?? segment.name;
}

/** Edition name in the site header. A prefix stays off the footer and page titles. */
export function segmentHeaderName(
  segment: Pick<Segment, "name" | "displayName" | "headerPrefix">,
): string {
  const edition = segmentDisplayName(segment);
  const prefix = segment.headerPrefix?.trim();
  return prefix ? `${prefix} ${edition}` : edition;
}

/** Sections that are live. Planned entries stay out of nav, signup, and llms text. */
export function activeSegments(): Segment[] {
  return segments.filter((segment) => segment.status === "active");
}

export function segmentTopics(segment: Segment | undefined): SegmentTopic[] {
  return segment?.topics ?? [];
}

export function getSegmentTopic(segment: Segment | undefined, key: string): SegmentTopic | undefined {
  return segmentTopics(segment).find((topic) => topic.key === key);
}

export function topicPagePath(segmentSlug: string, topicKey: string): string {
  return `/${segmentSlug}/tools/topic/${topicKey}`;
}

export function topicPageHeading(segmentName: string, topic: SegmentTopic): string {
  return topic.heading ?? `AI tools for ${topic.phrase} in ${segmentName.toLowerCase()}`;
}

export function topicPageDescription(segmentName: string, topic: SegmentTopic): string {
  const first = topic.intro.split(/(?<=\.)\s/)[0] ?? topic.intro;
  return capDescription(`${topicPageHeading(segmentName, topic)}. ${first}`);
}

/** First active section. Home, signup, and the launch newsletter use this. */
export function featuredSegment(): Segment {
  return segments.find((segment) => segment.status === "active") ?? segments[0];
}

/** Home-page card status. Planned sections are not labeled live. */
export function segmentCardLabel(segment: Segment): "In preparation" | "Launch" | "Live" {
  if (segment.status === "planned") return "In preparation";
  if (segment.slug === featuredSegment().slug) return "Launch";
  return "Live";
}

export function segmentCardPillClass(segment: Segment): string {
  const label = segmentCardLabel(segment);
  if (label === "In preparation") return "pill";
  if (label === "Launch") return "pill launch";
  return "pill live";
}

/**
 * Cross-segment tools index, when one is published.
 * Null sends non-segment pages to the first launched section's directory.
 */
export const toolsIndexPath: string | null = null;

export function toolDirectoryPath(segment: Segment): string {
  if (segment.slug === "aviation") return `/${segment.slug}/toolbox`;
  return `/${segment.slug}/tools`;
}

/** Nav and crumb label. Aviation's directory is the Toolbox. */
export function toolDirectoryLabel(segment: Segment): string {
  return segment.slug === "aviation" ? "Toolbox" : "Tool directory";
}

function normalizePath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] || "/";
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  if (withSlash.length > 1 && withSlash.endsWith("/")) return withSlash.slice(0, -1);
  return withSlash;
}

/** Section that owns this path, including its issues and tool directory. */
export function segmentFromPathname(pathname: string): Segment | undefined {
  const slug = normalizePath(pathname).split("/").filter(Boolean)[0];
  return slug ? getSegment(slug) : undefined;
}

/**
 * Header target for Tool Directory.
 * An open section links to its own directory. A planned section has no directory yet, so the link
 * goes to the cross-segment index, or the first launched section.
 */
export function toolDirectoryHref(pathname: string, indexPath: string | null = toolsIndexPath): string {
  const segment = segmentFromPathname(pathname);
  if (segment?.status === "active") return toolDirectoryPath(segment);
  if (indexPath) return indexPath;
  return toolDirectoryPath(featuredSegment());
}

/** True on a section directory, a tool page, or the cross-segment tools index. */
export function isToolDirectoryPath(pathname: string, indexPath: string | null = toolsIndexPath): boolean {
  const path = normalizePath(pathname);
  if (indexPath) {
    const index = normalizePath(indexPath);
    if (path === index || path.startsWith(`${index}/`)) return true;
  }
  const [slug, section] = path.split("/").filter(Boolean);
  return Boolean(slug && (section === "tools" || section === "toolbox") && getSegment(slug));
}

export function segmentResendId(segment: Segment): string | undefined {
  const current = process.env[segment.resendSegmentEnv];
  if (current) return current;
  const legacy = process.env[segment.resendAudienceEnv];
  return legacy || undefined;
}
