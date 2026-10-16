"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SocialLinks } from "@/components/SocialLinks";
import { useRememberedSlug } from "@/components/useRememberedSlug";
import { segmentUnsubscribeHref } from "@/lib/segment-memory";
import { site } from "@/lib/site";

export function SiteFooter() {
  const pathname = usePathname() || "/";
  const rememberedSlug = useRememberedSlug();
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <p>{site.name} is a free weekday briefing. Sponsors are labeled.</p>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href={segmentUnsubscribeHref(pathname, rememberedSlug)}>Unsubscribe</Link>
          <Link href="/sponsor">Sponsor</Link>
          <Link href="/media-kit">Media kit</Link>
          <Link href="/llms.txt">llms.txt</Link>
          <SocialLinks />
        </nav>
      </div>
    </footer>
  );
}
