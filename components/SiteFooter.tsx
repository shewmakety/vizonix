import Link from "next/link";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap footer-inner">
        <p>
          {site.name} is a free weekday briefing. Sponsors are labeled. Sample listings are fictional.
        </p>
        <nav className="footer-links" aria-label="Footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/unsubscribe">Unsubscribe</Link>
          <Link href="/sponsor">Sponsor</Link>
          <Link href="/llms.txt">llms.txt</Link>
        </nav>
      </div>
    </footer>
  );
}
