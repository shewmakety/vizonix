"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRememberedSlug } from "@/components/useRememberedSlug";
import {
  segmentDirectoryHref,
  segmentHomeHref,
  segmentSubscribeHref,
} from "@/lib/segment-memory";
import { getSegment, isToolDirectoryPath, segmentHeaderName } from "@/lib/segments";
import { sectionWordmark, site } from "@/lib/site";

function current(active: boolean): "page" | undefined {
  return active ? "page" : undefined;
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const rememberedSlug = useRememberedSlug();
  const onSponsor = pathname === "/sponsor" || pathname.startsWith("/sponsor/");
  const onAbout = pathname === "/about" || pathname.startsWith("/about/");
  const subscribeHref = segmentSubscribeHref(pathname, rememberedSlug);
  const onSubscribe = pathname === subscribeHref || pathname === "/subscribe" || pathname.startsWith("/subscribe/");
  const sectionSlug = pathname.split("/").filter(Boolean)[0];
  const section = sectionSlug ? getSegment(sectionSlug) : undefined;
  const wordmark = section?.status === "active" ? sectionWordmark(segmentHeaderName(section)) : site.name;
  const onIssue = /^\/[^/]+\/issues\/\d{4}-\d{2}-\d{2}\/?$/.test(pathname);

  return (
    <header className={onIssue ? "site-header on-issue" : "site-header"}>
      <div className="wrap header-inner">
        <Link className="brand" href={segmentHomeHref(pathname, rememberedSlug)}>
          <span className="brand-mark">V</span>
          <span className="brand-name">{wordmark}</span>
        </Link>
        <div className="header-menu">
          <nav className="site-nav" aria-label="Site">
            <Link href="/sponsor" aria-current={current(onSponsor)}>
              Sponsor
            </Link>
            <Link href="/about" aria-current={current(onAbout)}>
              About
            </Link>
            <Link
              href={segmentDirectoryHref(pathname, rememberedSlug)}
              aria-current={current(isToolDirectoryPath(pathname))}
            >
              Toolbox
            </Link>
          </nav>
          <Link className="header-cta" href={subscribeHref} aria-current={current(onSubscribe)}>
            Subscribe
          </Link>
        </div>
      </div>
    </header>
  );
}
