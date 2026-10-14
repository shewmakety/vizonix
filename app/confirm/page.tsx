import type { Metadata } from "next";
import { TokenForm } from "@/components/TokenForm";
import { tokenSecret, verifyToken } from "@/lib/tokens";
import { getSegment } from "@/lib/segments";

export const metadata: Metadata = {
  title: "Confirm subscription",
  description: "Confirm your Vizonix email address.",
  alternates: { canonical: "/confirm" },
  robots: { index: false, follow: false },
};

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const secret = tokenSecret();
  const payload = token && secret ? verifyToken(token, secret, "confirm") : null;
  const segment = payload ? getSegment(payload.segment) : undefined;

  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">Confirm</p>
        <h1>Confirm your subscription</h1>
        {!token ? (
          <p>
            This page finishes a subscription after you open the confirmation email. Open the link in
            that message, then confirm here. The extra click keeps a mail client from confirming you by
            accident.
          </p>
        ) : !secret ? (
          <p className="form-error">Confirmation is not configured yet.</p>
        ) : !payload || !segment ? (
          <p className="form-error">This confirmation link is invalid or expired.</p>
        ) : (
          <>
            <p>
              Confirm {payload.email} for the {segment.name} briefing. You will not be on the list until
              you do.
            </p>
            <TokenForm token={token} endpoint="/api/confirm" label="Confirm subscription" />
          </>
        )}
      </div>
    </section>
  );
}
