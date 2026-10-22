import { issueModifiedInstant } from "@/lib/content";
import { calendarInstant } from "@/lib/dates";
import type { Issue, ToolEntry } from "@/lib/schema";
import { absoluteUrl, editor, organizationSameAs, site, siteUrl } from "@/lib/site";
import { getSegment } from "@/lib/segments";

function hasPublicPrice(pricing: string): boolean {
  return /\d/.test(pricing);
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: siteUrl(),
    description: site.description,
    email: site.email,
    logo: absoluteUrl("/logo.png"),
    sameAs: organizationSameAs,
    founder: {
      "@type": "Person",
      name: editor.name,
      jobTitle: editor.jobTitle,
      url: absoluteUrl(editor.path),
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: siteUrl(),
    description: site.description,
    publisher: { "@type": "Organization", name: site.name, url: siteUrl() },
  };
}

export function personAuthorJsonLd() {
  return {
    "@type": "Person",
    name: editor.name,
    jobTitle: editor.jobTitle,
    url: absoluteUrl(editor.path),
  };
}

export function issueJsonLd(issue: Issue, now = new Date()) {
  const segment = getSegment(issue.segment);
  const modified = issueModifiedInstant(issue, now);
  const path = `/${issue.segment}/issues/${issue.date}`;
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: issue.subject,
    datePublished: calendarInstant(issue.date).toISOString(),
    dateModified: modified.toISOString(),
    description: issue.preheader,
    image: absoluteUrl(`${path}/opengraph-image`),
    articleSection: segment?.name ?? issue.segment,
    mainEntityOfPage: absoluteUrl(path),
    author: personAuthorJsonLd(),
    editor: personAuthorJsonLd(),
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: siteUrl(),
      logo: {
        "@type": "ImageObject",
        url: absoluteUrl("/logo.png"),
      },
    },
    isAccessibleForFree: true,
  };
}

export function toolJsonLd(tool: ToolEntry, options?: { sponsored?: boolean }) {
  const description = tool.sample
    ? `Sample listing. ${tool.summary} This is fictional and not a real product.`
    : options?.sponsored
      ? `Sponsored listing. ${tool.summary}`
      : tool.summary;
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: "BusinessApplication",
    description,
    url: absoluteUrl(`/${tool.segment}/tools/${tool.slug}`),
    ...(tool.sample ? {} : { sameAs: tool.url }),
    ...(tool.company ? { provider: { "@type": "Organization", name: tool.company } } : {}),
    ...(hasPublicPrice(tool.pricing)
      ? { offers: { "@type": "Offer", description: tool.pricing } }
      : {}),
  };
}

function directoryItemList(
  tools: Array<Pick<ToolEntry, "name" | "segment" | "slug">>,
  nameFor: (tool: Pick<ToolEntry, "name">) => string,
  extra?: { name: string; description: string },
) {
  return {
    "@type": "ItemList",
    ...(extra ? { name: extra.name, description: extra.description } : {}),
    itemListElement: tools.map((tool, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: nameFor(tool),
      url: absoluteUrl(`/${tool.segment}/tools/${tool.slug}`),
    })),
  };
}

export function collectionJsonLd(input: {
  name: string;
  description: string;
  path: string;
  tools: Array<Pick<ToolEntry, "name" | "segment" | "slug">>;
  /** Paid slots. They are omitted from the organic ItemList so position is not a ranking. */
  sponsoredSlugs?: readonly string[];
}) {
  const sponsoredSet = new Set(input.sponsoredSlugs ?? []);
  const sponsored = input.tools.filter((tool) => sponsoredSet.has(tool.slug));
  const organic = input.tools.filter((tool) => !sponsoredSet.has(tool.slug));
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.path),
    mainEntity: directoryItemList(organic, (tool) => tool.name),
    ...(sponsored.length > 0
      ? {
          hasPart: directoryItemList(sponsored, (tool) => `${tool.name} (Sponsored)`, {
            name: "Sponsored listings",
            description: "Paid placements. Order in this list is not a ranking and is not an editorial order.",
          }),
        }
      : {}),
  };
}

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function sponsorFaqJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is a sponsorship week?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "A week is five weekday issues, Monday through Friday, of one section newsletter.",
        },
      },
      {
        "@type": "Question",
        name: "How many sponsors run in one issue?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Two newsletter sponsors at most: one primary and one secondary.",
        },
      },
      {
        "@type": "Question",
        name: "What is the founding sponsor offer?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "The first 10 sponsors pay half the launch price, locked for 3 months. They then move to the current tier with a 25% loyalty discount for 3 more months.",
        },
      },
    ],
  };
}
