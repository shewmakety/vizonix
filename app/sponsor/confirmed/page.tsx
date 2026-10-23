import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sponsorship checkout",
  description: "Stripe has your payment. The week is reserved when the webhook confirms it.",
  alternates: { canonical: "/sponsor/confirmed" },
  robots: { index: false, follow: false },
};

export default function SponsorConfirmedPage() {
  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">Sponsor</p>
        <h1>Payment received by Stripe.</h1>
        <p>
          If Stripe sent you here, the charge is processing. The week is recorded when the webhook
          confirms the checkout session. You will also get a receipt from Stripe. The company name and
          ad copy from the form go with that checkout. A reservation does not include your email in the
          public site record.
        </p>
        <p>
          <Link href="/sponsor">Back to the rate card</Link>
        </p>
      </div>
    </section>
  );
}
