"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isToolDirectoryPath, toolDirectoryHref } from "@/lib/segments";

function current(active: boolean): "page" | undefined {
  return active ? "page" : undefined;
}

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const onSponsor = pathname === "/sponsor" || pathname.startsWith("/sponsor/");
  const onAbout = pathname === "/about" || pathname.startsWith("/about/");
  const onSubscribe = pathname === "/subscribe" || pathname.startsWith("/subscribe/");

  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">V</span>
          <span className="brand-name">Vizonix</span>
        </Link>
        <nav className="site-nav" aria-label="Site">
          <Link href="/sponsor" aria-current={current(onSponsor)}>
            Sponsor
          </Link>
          <Link href="/about" aria-current={current(onAbout)}>
            About
          </Link>
          <Link href={toolDirectoryHref(pathname)} aria-current={current(isToolDirectoryPath(pathname))}>
            Tool Directory
          </Link>
        </nav>
        <Link className="header-cta" href="/subscribe" aria-current={current(onSubscribe)}>
          Subscribe
        </Link>
      </div>
    </header>
  );
}
