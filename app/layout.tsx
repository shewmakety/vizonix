import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { AVIATION_FEED_PATH, capDescription } from "@/lib/meta";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const description = capDescription(
  "A free weekday briefing on AI tools that make a specific business more profitable. Aviation is the launch section.",
);

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Vizonix - Free daily AI briefing for business",
    template: "%s | Vizonix",
  },
  description,
  applicationName: "Vizonix",
  openGraph: {
    type: "website",
    siteName: "Vizonix",
    title: "Vizonix - Free daily AI briefing for business",
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vizonix - Free daily AI briefing for business",
    description,
  },
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": AVIATION_FEED_PATH },
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <SiteHeader />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <main id="content">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
