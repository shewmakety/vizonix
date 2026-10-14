import type { Issue, ToolEntry } from "@/lib/schema";
import { absoluteUrl, site, siteUrl } from "@/lib/site";
import { getSegment } from "@/lib/segments";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.name,
    url: siteUrl(),
    description: site.description,
    email: site.emailHello,
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: siteUrl(),
    description: site.description,
    publisher: { "@type": "Organization", name: site.name },
  };
}

export function issueJsonLd(issue: Issue) {
  const segment = getSegment(issue.segment);
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: issue.subject,
    datePublished: issue.date,
    description: issue.preheader,
    articleSection: segment?.name ?? issue.segment,
    mainEntityOfPage: absoluteUrl(`/${issue.segment}/issues/${issue.date}`),
    author: { "@type": "Organization", name: site.name },
    publisher: {
      "@type": "Organization",
      name: site.name,
      url: siteUrl(),
    },
    isAccessibleForFree: true,
  };
}

export function toolJsonLd(tool: ToolEntry) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: tool.name,
    applicationCategory: "BusinessApplication",
    description: tool.sample
      ? `Sample listing. ${tool.summary} This is fictional and not a real product.`
      : tool.summary,
    url: absoluteUrl(`/${tool.segment}/tools/${tool.slug}`),
    offers: {
      "@type": "Offer",
      description: tool.pricing,
    },
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
          text: "Three newsletter sponsors at most: one primary, one secondary, and one classified.",
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
