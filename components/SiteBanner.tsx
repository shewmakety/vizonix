import Link from "next/link";

export function SiteBanner({ sectionName }: { sectionName: string }) {
  return (
    <aside className="site-banner">
      <div className="wrap">
        <p>
          <span className="kicker">Site banner, open</span>
          <br />
          This banner runs on the {sectionName} section and its article pages for 7 days.
        </p>
        <Link href="/sponsor">View rates</Link>
      </div>
    </aside>
  );
}
