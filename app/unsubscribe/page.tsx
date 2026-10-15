import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { TokenForm } from "@/components/TokenForm";
import { UnsubscribeRequestForm } from "@/components/UnsubscribeRequestForm";
import { SEGMENT_COOKIE, SEGMENT_HEADER, resolveRememberedSlug } from "@/lib/segment-memory";
import { featuredSegment, getSegment } from "@/lib/segments";
import { tokenSecret, verifyToken } from "@/lib/tokens";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: "Leave a Vizonix briefing.",
  alternates: { canonical: "/unsubscribe" },
  robots: { index: false, follow: true },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const secret = tokenSecret();
  const payload = token && secret ? verifyToken(token, secret, "unsubscribe") : null;
  const segment = payload ? getSegment(payload.segment) : undefined;
  const headerStore = await headers();
  const cookieStore = await cookies();
  const defaultSegment =
    resolveRememberedSlug(headerStore.get(SEGMENT_HEADER), cookieStore.get(SEGMENT_COOKIE)?.value) ??
    featuredSegment().slug;

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
        <UnsubscribeRequestForm defaultSegment={defaultSegment} />
      </div>
    </section>
  );
}
