import { RememberedUnsubscribeLink } from "@/components/RememberedLinks";
import { pageMeta } from "@/lib/meta";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  title: "Privacy",
  description: "What Vizonix collects, why, and how to leave the list.",
  canonical: "/privacy",
});

export default function PrivacyPage() {
  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">Privacy</p>
        <h1>What we keep, and why.</h1>
        <p>
          Vizonix collects the email address you submit, an optional first name, and the section you
          asked to receive. We use that to send the briefing and the confirmation message. We do not sell
          personal information.
        </p>
        <h2>Double opt-in</h2>
        <p>
          Signup creates a contact in Resend and marks it unsubscribed until you confirm. You are not on
          the sending list until you open the confirmation email and confirm. Confirmation links expire
          after 48 hours.
        </p>
        <h2>Unsubscribe</h2>
        <p>
          Every issue includes an unsubscribe link. You can also request one from the{" "}
          <RememberedUnsubscribeLink />. Unsubscribing stops the briefing. Resend
          stores the contact so we do not keep mailing you by mistake.
        </p>
        <h2>Sponsorship checkout</h2>
        <p>
          Sponsor payments run through Stripe. Stripe collects the payment details. We store the section,
          placement, and dates of a paid reservation in the site repository so the week can be blocked.
          That record does not include your email address or card number. The email and ad-copy link stay
          in Stripe and, if configured, in a notice to the operator.
        </p>
        <h2>Processors</h2>
        <p>
          The site is hosted on Vercel. Email and the contact list are handled by Resend. Payments are
          handled by Stripe. The content repository is on GitHub. Those companies process data only to
          provide the briefing, the archive, and sponsorship checkout.
        </p>
        <h2>Contact</h2>
        <p>
          Privacy questions: <a href={`mailto:${site.emailPrivacy}`}>{site.emailPrivacy}</a>
        </p>
      </div>
    </section>
  );
}
