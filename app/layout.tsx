import type { Metadata } from "next";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { site, siteUrl } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Vizonix",
    template: "%s | Vizonix",
  },
  description: site.description,
  applicationName: "Vizonix",
  openGraph: {
    type: "website",
    siteName: "Vizonix",
    title: "Vizonix",
    description: site.description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vizonix",
    description: site.description,
  },
  alternates: { canonical: "/" },
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
