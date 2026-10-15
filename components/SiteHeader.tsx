import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap header-inner">
        <Link className="brand" href="/">
          <span className="brand-mark">V</span>
          <span className="brand-name">Vizonix</span>
        </Link>
        <nav className="site-nav" aria-label="Site">
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
