import { PreferencesForm } from "@/components/PreferencesForm";
import { pageMeta } from "@/lib/meta";
import { ALWAYS_ON_NOTE } from "@/lib/reader-topics";
import { readReaderPrefs } from "@/lib/reader-store";
import { getSegment } from "@/lib/segments";
import { site } from "@/lib/site";
import { tokenSecret, verifyToken } from "@/lib/tokens";

export const metadata = pageMeta({
  title: "Manage your topics",
  description: "Choose the aviation sections in your Vizonix briefing.",
  canonical: "/preferences",
  robots: { index: false, follow: false },
});

export default async function PreferencesPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const secret = tokenSecret();
  const payload = token && secret ? verifyToken(token, secret, "preferences") : null;
  const segment = payload ? getSegment(payload.segment) : undefined;
  const live = segment?.status === "active" ? segment : undefined;
  const stored = payload && live ? await readReaderPrefs(payload.email) : undefined;

  return (
    <section className="hero">
      <div className="wrap split">
        <div className="prose">
          <p className="kicker">Preferences</p>
          <h1>Manage your topics</h1>
          {!token ? (
            <p>
              Open the Manage your topics link at the bottom of any briefing. That link is signed for your
              email address. There is no password.
            </p>
          ) : !secret ? (
            <p className="form-error">Preferences are not configured yet.</p>
          ) : !payload || !live ? (
            <p className="form-error">
              This link is invalid or expired. Open the latest briefing and use Manage your topics there.
              Questions: <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          ) : stored?.state === "error" ? (
            <p className="form-error">
              We could not load your topics. Try the link again in a few minutes. Questions:{" "}
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          ) : (
            <>
              <p>
                These choices apply to the next {live.name} briefing for {payload.email}. {ALWAYS_ON_NOTE}
              </p>
              <p>Uncheck a section to leave it out of the email. The archive on the site still has it.</p>
            </>
          )}
        </div>
        {token && payload && live && stored && stored.state !== "error" ? (
          <PreferencesForm
            token={token}
            initialExcluded={stored.state === "ready" ? stored.prefs.excluded : []}
          />
        ) : null}
      </div>
    </section>
  );
}
