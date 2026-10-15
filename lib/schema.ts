import { z } from "zod";
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

const issueSectionSchema = z.object({
  topic: z.string().trim().min(1).max(120),
  intro: z.string().trim().min(1).max(1200).optional(),
  introSourceUrl: href.optional(),
  coverageNote: z.string().trim().min(1).max(500).optional(),
  tools: z.array(issueToolSchema).min(1).max(8),
});

export type IssueSection = z.infer<typeof issueSectionSchema>;

export const issueSchema = z
  .object({
    segment: z.string().trim().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
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
  })
  .superRefine((tool, ctx) => {
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
