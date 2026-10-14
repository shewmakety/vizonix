import { z } from "zod";
import { getPlacement, wordCount } from "@/lib/rate-card";
import { getSegment } from "@/lib/segments";

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
    }),
    tools: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(120),
          slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          summary: z.string().trim().min(1).max(600),
          whyItMatters: z.string().trim().min(1).max(800),
          url: href,
          pricing: z.string().trim().min(1).max(200),
        }),
      )
      .min(1)
      .max(8),
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

export const toolSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  segment: z.string().trim().min(1),
  name: z.string().trim().min(1).max(120),
  sample: z.boolean(),
  category: z.string().trim().min(1).max(80),
  summary: z.string().trim().min(1).max(400),
  paragraphs: z.array(z.string().trim().min(1).max(1200)).min(1).max(6),
  whyItMatters: z.string().trim().min(1).max(800),
  pricing: z.string().trim().min(1).max(200),
  bestFor: z.string().trim().min(1).max(240),
  url: httpUrl,
});

export type ToolEntry = z.infer<typeof toolSchema>;

export function parseIssue(input: unknown): Issue {
  return issueSchema.parse(input);
}

export function parseTool(input: unknown): ToolEntry {
  return toolSchema.parse(input);
}
