import { z } from "zod";
import { isIsoDate } from "@/lib/dates";
import { getPlacement, wordCount } from "@/lib/rate-card";
import { getSegment, segmentTopics } from "@/lib/segments";

const httpUrl = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Link must be an http(s) URL");

const href = z
  .string()
  .trim()
  .refine((value) => {
    if (value.startsWith("/") && !value.startsWith("//")) return true;
    return httpUrl.safeParse(value).success;
  }, "Link must be a site path or an http(s) URL");

/**
 * General aviation, business, and IT vocabulary. A glossary may define only
 * terms specific to AI and robotics, such as LLM, agent, computer vision, AMR, and cobot.
 */
export const nonAiGlossaryTerms = [
  "algorithm",
  "api",
  "azure ai foundry",
  "back test",
  "back tested",
  "backtest",
  "backtested",
  "beta",
  "drone",
  "fod",
  "fsdo",
  "ground station",
  "hand off",
  "handoff",
  "interactive slide",
  "proof of concept",
  "pss",
  "public beta",
  "subprocessor",
] as const;

/** Lowercase, hyphen-insensitive key for glossary term checks. */
export function glossaryTermKey(term: string): string {
  return term.trim().toLowerCase().replace(/-/g, " ").replace(/\s+/g, " ");
}

const nonAiGlossaryTermKeys = new Set(nonAiGlossaryTerms.map((term) => glossaryTermKey(term)));

/** True when the term is general aviation, business, or IT vocabulary. */
export function isGeneralGlossaryTerm(term: string): boolean {
  const key = glossaryTermKey(term);
  return nonAiGlossaryTermKeys.has(key) || nonAiGlossaryTermKeys.has(key.replace(/ /g, ""));
}

export const sponsorSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    url: href,
    copy: z.string().trim().min(1).max(1200),
    cta: z.string().trim().min(1).max(80),
    ctaUrl: href,
    ctaSecondary: z.string().trim().min(1).max(80).optional(),
    ctaSecondaryUrl: href.optional(),
    /** House ad, not a paid placement. Renders without a sponsored relationship. */
    house: z.boolean().optional(),
    sample: z.boolean().optional(),
  })
  .superRefine((sponsor, ctx) => {
    const hasLabel = Boolean(sponsor.ctaSecondary);
    const hasUrl = Boolean(sponsor.ctaSecondaryUrl);
    if (hasLabel !== hasUrl) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ctaSecondary"],
        message: "A second call to action needs both a label and a URL.",
      });
    }
  });

export type SponsorCreative = z.infer<typeof sponsorSchema>;

const issueToolSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  company: z.string().trim().min(1).max(160).optional(),
  summary: z.string().trim().min(1).max(1200),
  whyItMatters: z.string().trim().min(1).max(1200),
  url: href,
  sourceUrl: href.optional(),
  pricing: z.string().trim().min(1).max(200),
  /** Set on a flat tools list so the page can group blurbs that share a topic. */
  topic: z.string().trim().min(1).max(120).optional(),
});

export type IssueTool = z.infer<typeof issueToolSchema>;

const roboticsItemSchema = z.object({
  headline: z.string().trim().min(1).max(180),
  summary: z.string().trim().min(1).max(1200),
  whyItMatters: z.string().trim().min(1).max(1200),
  sourceName: z.string().trim().min(1).max(120),
  sourceUrl: href,
});

export type RoboticsItem = z.infer<typeof roboticsItemSchema>;

/** Paid line at the top of one numbered section. Absent sections show an open placeholder. */
export const sectionSponsorSchema = z.object({
  name: z.string().trim().min(1).max(120),
  line: z.string().trim().min(1).max(200),
  url: href,
  logo: href.optional(),
});

export type SectionSponsor = z.infer<typeof sectionSponsorSchema>;

const issueSectionSchema = z.object({
  topic: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(1200).optional(),
  introSourceUrl: href.optional(),
  coverageNote: z.string().trim().min(1).max(500).optional(),
  /** One robotics note beside the AI tools. Omitted sections stay AI-only. */
  robotics: roboticsItemSchema.optional(),
  /** Omitted when the section has no sponsor. The page then shows the open placeholder. */
  sponsor: sectionSponsorSchema.optional(),
  tools: z.array(issueToolSchema).min(1).max(8),
});

export type IssueSection = z.infer<typeof issueSectionSchema>;

/** Last section on a sectioned issue, after the industry topics. */
export const productivitySectionTopic = "General AI Productivity Tools";

const rampStatusUrl = z
  .string()
  .trim()
  .refine((value) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" && url.protocol !== "http:") return false;
      const host = url.hostname.toLowerCase().replace(/^www\./, "");
      if (host !== "x.com" && host !== "twitter.com" && host !== "mobile.twitter.com") return false;
      return /^\/[^/]+\/status\/\d+/.test(url.pathname);
    } catch {
      return false;
    }
  }, "Ramp link must be an x.com or twitter.com status.");

const rampPostSchema = z.object({
  author: z.string().trim().min(1).max(80),
  handle: z
    .string()
    .trim()
    .regex(/^@?[A-Za-z0-9_]{1,15}$/, "Handle must be an X username."),
  url: rampStatusUrl,
  text: z.string().trim().min(1).max(2000),
  postedAt: z
    .string()
    .trim()
    .refine(
      (value) => isIsoDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value)),
      "postedAt must be an ISO date.",
    ),
  note: z.string().trim().min(1).max(400).optional(),
});

export const rampSchema = z.object({
  intro: z.string().trim().min(1).max(600).optional(),
  posts: z.array(rampPostSchema).min(1).max(6),
});

export type RampPost = z.infer<typeof rampPostSchema>;
export type Ramp = z.infer<typeof rampSchema>;

export function rampHandle(handle: string): string {
  return handle.startsWith("@") ? handle : `@${handle}`;
}

export const issueSchema = z
  .object({
    segment: z.string().trim().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    /** Real publish time. Use this when `date` is the send day and that day is still ahead. */
    publishedAt: z
      .string()
      .refine((value) => !Number.isNaN(Date.parse(value)), "publishedAt must be a timestamp")
      .optional(),
    sample: z.boolean(),
    subject: z.string().trim().min(1).max(140),
    preheader: z.string().trim().min(1).max(200),
    lead: z.object({
      kicker: z.string().trim().min(1).max(80),
      title: z.string().trim().min(1).max(180),
      summary: z.string().trim().min(1).max(2000),
      whyItMatters: z.string().trim().min(1).max(1200),
      sourceName: z.string().trim().min(1).max(120),
      sourceUrl: href,
      productUrl: href.optional(),
    }),
    /** Best X posts of the day. Omitted issues skip The Ramp. */
    ramp: rampSchema.optional(),
    /**
     * Flat list. Required unless `sections` is set.
     * A sectioned issue can omit this and keep the tools inside sections.
     */
    tools: z.array(issueToolSchema).max(16).optional(),
    /** Topic groups. When present, these are what the page and the email render. */
    sections: z.array(issueSectionSchema).min(1).max(12).optional(),
    playbook: z.object({
      title: z.string().trim().min(1).max(180),
      intro: z.string().trim().min(1).max(1200),
      steps: z.array(z.string().trim().min(1).max(400)).min(1).max(8),
    }),
    quickLinks: z
      .array(
        z.object({
          title: z.string().trim().min(1).max(140),
          url: href,
          note: z.string().trim().min(1).max(240),
        }),
      )
      .min(1)
      .max(12),
    /** Plain-language definitions for AI and robotics terms used in this issue. Omitted issues skip the glossary. */
    glossary: z
      .array(
        z.object({
          term: z.string().trim().min(1).max(80),
          definition: z.string().trim().min(1).max(400),
        }),
      )
      .min(1)
      .max(24)
      .optional(),
    sponsors: z.object({
      primary: sponsorSchema.nullable(),
      secondary: sponsorSchema.nullable(),
      classified: sponsorSchema.nullable(),
    }),
  })
  .superRefine((issue, ctx) => {
    if (!getSegment(issue.segment)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["segment"],
        message: "Unknown segment. Add it to lib/segments.ts first.",
      });
    }

    const sectionCount = issue.sections?.reduce((sum, section) => sum + section.tools.length, 0) ?? 0;
    const flatCount = issue.tools?.length ?? 0;
    if (sectionCount + flatCount < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tools"],
        message: "Add at least one tool, either in tools or in sections.",
      });
    }
    if (sectionCount > 16) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sections"],
        message: "An issue can list at most 16 tools across its sections.",
      });
    }
    const glossaryTerms = new Set<string>();
    for (const [index, entry] of (issue.glossary ?? []).entries()) {
      const key = glossaryTermKey(entry.term);
      if (glossaryTerms.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["glossary", index, "term"],
          message: "Glossary terms must be unique.",
        });
      }
      glossaryTerms.add(key);
      if (isGeneralGlossaryTerm(entry.term)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["glossary", index, "term"],
          message: `Glossary terms must be specific to AI and robotics. "${entry.term}" is general aviation, business, or IT vocabulary.`,
        });
      }
    }

    if (issue.sections && issue.sections.length > 0) {
      const productivity = issue.sections.filter((section) => section.topic === productivitySectionTopic);
      if (productivity.length !== 1 || issue.sections.at(-1)?.topic !== productivitySectionTopic) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sections"],
          message: `End the sections with one "${productivitySectionTopic}" section, after the industry topics.`,
        });
      }
    }

    const slots: Array<["primary" | "secondary" | "classified", SponsorCreative | null]> = [
      ["primary", issue.sponsors.primary],
      ["secondary", issue.sponsors.secondary],
      ["classified", issue.sponsors.classified],
    ];

    for (const [slot, creative] of slots) {
      if (!creative) continue;
      const placement = getPlacement(slot);
      if (!placement?.maxWords) continue;
      const count = wordCount(creative.copy);
      if (count > placement.maxWords) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sponsors", slot, "copy"],
          message: `${slot} copy is ${count} words. The ceiling is ${placement.maxWords}.`,
        });
      }
    }
  });

export type Issue = z.infer<typeof issueSchema>;
export type GlossaryEntry = NonNullable<Issue["glossary"]>[number];

/** Glossary rows in alphabetical order. Issues with no glossary return an empty list. */
export function sortedGlossary(entries: GlossaryEntry[] | undefined): GlossaryEntry[] {
  return [...(entries ?? [])].sort((a, b) => a.term.localeCompare(b.term, "en", { sensitivity: "base" }));
}

/** Tools the page and email should show. Sections win when both are present. */
export function issueTools(issue: Issue): IssueTool[] {
  if (issue.sections && issue.sections.length > 0) {
    return issue.sections.flatMap((section) => section.tools);
  }
  return issue.tools ?? [];
}

export type IssueSectionView = {
  topic?: string;
  intro?: string;
  introSourceUrl?: string;
  coverageNote?: string;
  robotics?: RoboticsItem;
  sponsor?: SectionSponsor;
  tools: IssueTool[];
};

/** Topic groups for rendering. A flat tools list with no topics is one untitled group. */
export function issueSections(issue: Issue): IssueSectionView[] {
  if (issue.sections && issue.sections.length > 0) return issue.sections;
  const tools = issue.tools ?? [];
  if (!tools.some((tool) => tool.topic)) {
    return tools.length > 0 ? [{ tools }] : [];
  }
  const groups: IssueSectionView[] = [];
  for (const tool of tools) {
    const topic = tool.topic ?? "Tool Highlights";
    const current = groups[groups.length - 1];
    if (current?.topic === topic) current.tools.push(tool);
    else groups.push({ topic, tools: [tool] });
  }
  return groups;
}

const topicKey = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const toolSchema = z
  .object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    segment: z.string().trim().min(1),
    name: z.string().trim().min(1).max(120),
    sample: z.boolean(),
    category: z.string().trim().min(1).max(120),
    company: z.string().trim().min(1).max(160).optional(),
    summary: z.string().trim().min(1).max(1200),
    paragraphs: z.array(z.string().trim().min(1).max(1200)).min(1).max(6),
    whyItMatters: z.string().trim().min(1).max(1200),
    pricing: z.string().trim().min(1).max(200),
    bestFor: z.string().trim().min(1).max(240).optional(),
    url: httpUrl,
    sourceUrl: httpUrl.optional(),
    /** Directory topic key. Optional so sections that have no topics still parse. */
    topic: topicKey.optional(),
    /** Use when a tool belongs in more than one directory topic. */
    topics: z.array(topicKey).min(1).max(6).optional(),
    /**
     * Paid directory placement. Ignored once `until` is before today in New York.
     * Do not set this on a tool that has not been bought.
     */
    featured: z
      .object({
        until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        tier: z.enum(["founding", "standard"]),
        blurb: z.string().trim().min(1).max(600).optional(),
        logo: httpUrl.optional(),
        cta: z.string().trim().min(1).max(80).optional(),
        ctaUrl: httpUrl.optional(),
      })
      .optional(),
  })
  .superRefine((tool, ctx) => {
    if (tool.featured && Boolean(tool.featured.cta) !== Boolean(tool.featured.ctaUrl)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["featured", "cta"],
        message: "A featured call to action needs both a label and a URL.",
      });
    }
    if (tool.slug === "topic") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["slug"],
        message: "The slug topic is reserved for directory topic pages.",
      });
    }
    const keys = [...(tool.topics ?? []), ...(tool.topic ? [tool.topic] : [])];
    if (keys.length === 0) return;
    const allowed = new Set(segmentTopics(getSegment(tool.segment)).map((topic) => topic.key));
    if (allowed.size === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["topic"],
        message: "This section has no directory topics yet.",
      });
      return;
    }
    for (const key of keys) {
      if (!allowed.has(key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["topic"],
          message: `Unknown directory topic: ${key}.`,
        });
      }
    }
  });

export type ToolEntry = z.infer<typeof toolSchema>;

export function parseIssue(input: unknown): Issue {
  return issueSchema.parse(input);
}

export function parseTool(input: unknown): ToolEntry {
  return toolSchema.parse(input);
}
