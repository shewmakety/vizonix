import { TokenForm } from "@/components/TokenForm";
import { UnsubscribeRequestForm } from "@/components/UnsubscribeRequestForm";
import { pageMeta } from "@/lib/meta";
import { getSegment } from "@/lib/segments";
import { tokenSecret, verifyToken } from "@/lib/tokens";

export const metadata = pageMeta({
  title: "Unsubscribe",
  description: "Leave a Vizonix briefing.",
  canonical: "/unsubscribe",
  robots: { index: false, follow: true },
});

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const secret = tokenSecret();
  const payload = token && secret ? verifyToken(token, secret, "unsubscribe") : null;
  const segment = payload ? getSegment(payload.segment) : undefined;

  return (
    <section className="hero">
      <div className="wrap split">
        <div className="prose">
          <p className="kicker">Unsubscribe</p>
          <h1>Leave the list</h1>
          {token && payload && segment ? (
            <>
              <p>
                This stops the {segment.name} briefing for {payload.email}. With one live section, that
                also marks the contact unsubscribed in Resend.
              </p>
              <TokenForm token={token} endpoint="/api/unsubscribe" label="Unsubscribe" />
            </>
          ) : token ? (
            <p className="form-error">This unsubscribe link is invalid or expired. Request a new one.</p>
          ) : (
            <p>
              Issues include their own unsubscribe link. If you do not have it, request a fresh link.
              We send it only to the address you enter.
            </p>
          )}
        </div>
        <UnsubscribeRequestForm />
      </div>
    </section>
  );
}
