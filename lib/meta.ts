import type { Metadata } from "next";

export const AVIATION_FEED_PATH = "/aviation/feed.xml";

/** Meta descriptions stay within the length search results actually show. */
export function capDescription(value: string, max = 160): string {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const slice = cleaned.slice(0, max);
  const space = slice.lastIndexOf(" ");
  const cut = (space >= 80 ? slice.slice(0, space) : slice).replace(/[.,;:]+$/, "").trim();
  const withPeriod = /[.!?]$/.test(cut) ? cut : `${cut}.`;
  return withPeriod.length <= max ? withPeriod : withPeriod.slice(0, max);
}

export function pageMeta(input: {
  title: string;
  description: string;
  canonical: string;
  absoluteTitle?: boolean;
  robots?: Metadata["robots"];
  type?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
}): Metadata {
  const description = capDescription(input.description);
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description,
    alternates: {
      canonical: input.canonical,
      types: { "application/rss+xml": AVIATION_FEED_PATH },
    },
    ...(input.robots ? { robots: input.robots } : {}),
    openGraph: {
      title: input.title,
      description,
      url: input.canonical,
      siteName: "Vizonix",
      type: input.type ?? "website",
      ...(input.publishedTime
        ? { publishedTime: input.publishedTime, modifiedTime: input.modifiedTime ?? input.publishedTime }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description,
    },
  };
}
