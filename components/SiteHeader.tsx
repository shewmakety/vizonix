"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRememberedSlug } from "@/components/useRememberedSlug";
import {
  segmentCurrentIssueHref,
  segmentDirectoryHref,
  segmentHomeHref,
  segmentSubscribeHref,
} from "@/lib/segment-memory";
import { getSegment, segmentHeaderName } from "@/lib/segments";
import { sectionWordmark, site } from "@/lib/site";

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const rememberedSlug = useRememberedSlug();
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
            <Link href={segmentCurrentIssueHref(pathname, rememberedSlug)}>Current Issue</Link>
            <Link href="/sponsor">Sponsor</Link>
            <Link href="/about">About</Link>
            <Link href={segmentDirectoryHref(pathname, rememberedSlug)}>Toolbox</Link>
            <Link href={segmentSubscribeHref(pathname, rememberedSlug)}>Subscribe</Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
