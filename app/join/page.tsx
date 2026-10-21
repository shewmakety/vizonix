import { JoinPreview } from "@/components/JoinPreview";
import { SignupForm } from "@/components/SignupForm";
import { latestPublishedIssue } from "@/lib/content";
import { pageMeta } from "@/lib/meta";
import { cleanSource } from "@/lib/reader-topics";
import { featuredSegment } from "@/lib/segments";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  title: "Join the aviation briefing",
  description: "A free weekday briefing on AI and robotics for aviation. Pick the sections you want and confirm your email.",
  canonical: "/join",
});

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;
  const source = cleanSource(src);
  const segment = featuredSegment();
  const issue = latestPublishedIssue(segment.slug);

  return (
    <>
      <section className="hero">
        <div className="wrap split">
          <div className="prose">
            <p className="kicker">Aviation</p>
            <h1>The weekday AI briefing for aviation.</h1>
            <p className="lede">
              Five minutes each weekday morning for MROs, operators, parts suppliers, and maintenance / AOG teams.
            </p>
            <h2>What you get</h2>
            <ul>
              <li>A free briefing on weekday mornings.</li>
              <li>The top story, The Ramp, and the sponsor slots in every issue.</li>
              <li>You choose the other aviation sections. The archive still has the rest.</li>
              <li>A confirmation email before you are added. Leave from any issue.</li>
            </ul>
            <p>
              Questions: <a href={`mailto:${site.email}`}>{site.email}</a>
            </p>
          </div>
          <SignupForm
            defaultSegment={segment.slug}
            showSegment={false}
            heading="Join the briefing"
            source={source}
          />
        </div>
      </section>
      {issue ? <JoinPreview issue={issue} /> : null}
    </>
  );
}
