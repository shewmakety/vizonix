import type { Metadata } from "next";
import Link from "next/link";
import { SocialLinks } from "@/components/SocialLinks";
import { pageMeta } from "@/lib/meta";
import { editor, site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "About",
  description: "What Vizonix covers, who publishes it, and how the briefing is funded.",
  canonical: "/about",
});

export default function AboutPage() {
  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">About</p>
        <h1>A briefing with a narrow job.</h1>
        <p className="lede">{site.description}</p>
        <h2 id="editor">Who publishes Vizonix</h2>
        <p>
          {editor.name} is the founder and editor. He has an aviation industry background and is the
          founder of AOG Alerts and MRO List.
        </p>
        <p>
          Follow Vizonix on <SocialLinks separator=" and " />.
        </p>
        <h2>What we cover</h2>
        <p>
          Vizonix reports emerging AI tools, bots, models, and resources. The test for inclusion is
          specific: could this change revenue, cost, or speed for the section&apos;s reader. Aviation is
          the first section, written for airlines, MROs, parts suppliers, operators, and maintenance / AOG
          teams. Legal, for lawyers and law practices, is in preparation. Warehousing, then marketing
          and sales, use the same format when they open.
        </p>
        <h2>How a section is organized</h2>
        <p>
          One domain. One path per section. Each weekday issue becomes its own page, and each tool in
          the directory has its own page. Adding a section is a config change plus a content folder, not
          a new site.
        </p>
        <h2>How it is funded</h2>
        <p>
          The email is free. Revenue is weekly sponsorship from AI companies. Slots are labeled. A
          mention that was not paid is not dressed up as a sponsor. Prices are on the{" "}
          <Link href="/sponsor">rate card</Link>.
        </p>
        <h2>Sections that are not open</h2>
        <p>
          Legal, warehousing, and marketing and sales are in preparation. Those pages say coming soon.
          They are not indexed, and they do not list issues or tools. The aviation issue is a published
          briefing, and each item on it names a source.
        </p>
        <h2>Contact</h2>
        <p>
          Readers: <a href={`mailto:${site.emailHello}`}>{site.emailHello}</a>
          <br />
          Sponsor inquiries: <Link href="/sponsor">the sponsor page</Link>
        </p>
      </div>
    </section>
  );
}
