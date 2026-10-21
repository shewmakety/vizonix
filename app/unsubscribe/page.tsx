import { TokenForm } from "@/components/TokenForm";
import { pageMeta } from "@/lib/meta";
import { getSegment } from "@/lib/segments";
import { tokenSecret, verifyToken } from "@/lib/tokens";

export const metadata = pageMeta({
  title: "Unsubscribe",
  description: "Leave a Vizonix briefing.",
  canonical: "/unsubscribe",
  robots: { index: false, follow: true },
});

const useEmailLink = "Use the unsubscribe link at the bottom of any briefing email.";

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
      <div className="wrap prose">
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
          <p className="form-error">This unsubscribe link is invalid or expired. {useEmailLink}</p>
        ) : (
          <p>{useEmailLink}</p>
        )}
      </div>
    </section>
  );
}
