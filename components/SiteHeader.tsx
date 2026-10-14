import Link from "next/link";
import { segments } from "@/lib/segments";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">V</span>
          <span className="brand-name">Vizonix</span>
        </Link>
        <nav className="site-nav" aria-label="Sections">
          {segments.map((segment) => (
            <Link key={segment.slug} href={`/${segment.slug}`}>
              {segment.name}
              {segment.status === "planned" ? <span className="nav-soon">Soon</span> : null}
            </Link>
          ))}
          <Link href="/sponsor">Sponsor</Link>
          <Link href="/about">About</Link>
        </nav>
        <Link className="header-cta" href="/subscribe">
          Subscribe
        </Link>
      </div>
    </header>
  );
}
