import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for reading Vizonix and for reserving a sponsorship.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">Terms</p>
        <h1>Read this before you rely on the briefing.</h1>
        <p>
          The briefing is information for operators. It is not legal advice, and it is not advice about
          any particular matter, client, or firm. Tools change. Check the current product yourself
          before you buy it or put it on a live file.
        </p>
        <h2>Sample data</h2>
        <p>
          Pages marked as sample data use fictional names. They are not offers, reviews, or
          endorsements.
        </p>
        <h2>Sponsorships</h2>
        <p>
          A sponsorship reservation is for the placement, section, and dates you choose at checkout.
          The week is blocked when Stripe confirms the payment. If we cannot run that week, we move the
          reservation to the next open week or refund the charge. Exclusivity is 50% above the listed
          price and is not included until that surcharge is paid.
        </p>
        <p>
          Sponsored placements are labeled. The archive copy stays on the site after the week ends,
          unless we agree otherwise in writing. Prices on the <Link href="/sponsor">rate card</Link> are
          the launch prices. They are repriced from the published ladder as the list grows.
        </p>
        <h2>The list</h2>
        <p>
          Subscribing requires a confirmation click. You can unsubscribe at any time. We may stop a
          section, or change its send time, and we will say so in the briefing.
        </p>
        <h2>Use of the site</h2>
        <p>
          You may link to issues and tool pages. You may not copy an issue wholesale or present sample
          listings as your own reviews. The Vizonix name and the text of the briefing belong to the
          publication.
        </p>
      </div>
    </section>
  );
}
