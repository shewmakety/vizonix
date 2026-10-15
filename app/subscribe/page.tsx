import { SignupForm } from "@/components/SignupForm";
import { pageMeta } from "@/lib/meta";

export const metadata = pageMeta({
  title: "Subscribe",
  description: "Confirm your email to receive a Vizonix section briefing.",
  canonical: "/subscribe",
});

export default function SubscribePage() {
  return (
    <section className="hero">
      <div className="wrap split">
        <div className="prose">
          <p className="kicker">Subscribe</p>
          <h1>The briefing is free. The confirmation is required.</h1>
          <p className="lede">
            We send a confirmation email. You are not subscribed until you click it. After that, the
            section you picked arrives on weekday mornings.
          </p>
          <p>
            Aviation is the launch section. Legal, warehousing, and marketing and sales are in
            preparation. You can join those lists now. They will not send a daily issue until the
            section opens.
          </p>
          <p>Leave any time from the link in the email, or from the unsubscribe page.</p>
        </div>
        <SignupForm />
      </div>
    </section>
  );
}
