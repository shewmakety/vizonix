import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/site-index";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries().map((entry) => ({
    url: absoluteUrl(entry.path),
    lastModified: entry.lastModified,
  }));
}
