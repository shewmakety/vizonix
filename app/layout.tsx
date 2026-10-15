import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { JsonLd } from "@/components/JsonLd";
import { organizationJsonLd, websiteJsonLd } from "@/lib/jsonld";
import { SEGMENT_COOKIE, SEGMENT_HEADER, resolveRememberedSlug } from "@/lib/segment-memory";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const rememberedSlug = resolveRememberedSlug(
    headerStore.get(SEGMENT_HEADER),
    cookieStore.get(SEGMENT_COOKIE)?.value,
  );

  return (
    <html lang="en">
      <body>
        <a className="skip" href="#content">
          Skip to content
        </a>
        <SiteHeader rememberedSlug={rememberedSlug} />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <main id="content">{children}</main>
        <SiteFooter rememberedSlug={rememberedSlug} />
      </body>
    </html>
  );
}
