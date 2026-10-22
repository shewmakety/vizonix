import { PreferencesForm } from "@/components/PreferencesForm";
import { pageMeta } from "@/lib/meta";
import { getSubscriberPrefs } from "@/lib/prefs";
import { getSegment, segmentDisplayName } from "@/lib/segments";
import { site } from "@/lib/site";
import { tokenSecret, verifyToken } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Manage your topics",
  description: "Choose which topics stay in your Vizonix briefing.",
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

  let excluded: string[] = [];
  let loadError = false;
  if (payload && live) {
    try {
      const stored = await getSubscriberPrefs(payload.email);
      excluded = stored?.excludedSections ?? [];
    } catch {
      loadError = true;
    }
  }

  return (
    <section className="hero">
      <div className="wrap split">
        <div className="prose">
          <p className="kicker">Topics</p>
          <h1>Manage your topics</h1>
          {!token ? (
            <p>
              Open the Customize link in any briefing. That link is signed for your email
              address. There is no password.
            </p>
          ) : !secret ? (
            <p className="form-error">Preferences are not configured yet.</p>
          ) : !payload || !live ? (
            <p className="form-error">This preferences link is invalid or expired.</p>
          ) : (
            <>
              <p>
                Choices for {payload.email} on the {segmentDisplayName(live)} briefing. Top story and
                sponsor slots stay in every issue.
              </p>
              <p>
                Questions: <a href={`mailto:${site.email}`}>{site.email}</a>
              </p>
            </>
          )}
        </div>
        {payload && live && token ? (
          loadError ? (
            <p className="form-error">We could not load your topics. Try the link again shortly.</p>
          ) : (
            <PreferencesForm token={token} segment={live.slug} excluded={excluded} />
          )
        ) : null}
      </div>
    </section>
  );
}
