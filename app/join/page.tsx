import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";
import { WhatWeDo } from "@/components/WhatWeDo";
import { latestPublishedIssue } from "@/lib/content";
import { issueDateline } from "@/lib/dates";
import { pageMeta } from "@/lib/meta";
import { cleanSource } from "@/lib/reader-sections";
import { issueSections } from "@/lib/schema";
import { featuredSegment, segmentDisplayName } from "@/lib/segments";

export const metadata = pageMeta({
  title: "Join the aviation briefing",
  description: "A free weekday briefing on AI and robotics for aviation. Pick the topics you want in the email.",
  canonical: "/join",
});

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ src?: string }>;
}) {
  const { src } = await searchParams;
  const segment = featuredSegment();
  const issue = latestPublishedIssue(segment.slug);
  const preview = issue ? issueSections(issue).slice(0, 2) : [];

  return (
    <>
      <section className="hero">
        <div className="wrap split">
          <div className="prose">
            <p className="kicker">Join</p>
            <h1>The weekday aviation briefing.</h1>
            <p className="lede">
              A short morning email on AI and robotics for airlines, MROs, parts suppliers, operators,
              and maintenance / AOG teams.
            </p>
            <h2>What you get</h2>
            <ul>
              <li>One issue each weekday morning.</li>
              <li>The top story, The Ramp, and the sponsor slot, every time.</li>
              <li>Topic sections you can turn off. Checked topics stay in the email.</li>
              <li>The same issue on the site, so a tool you saw in the morning is still there later.</li>
            </ul>
            <p>Free. We send a confirmation email first. You are not on the list until you click it.</p>
          </div>
          <SignupForm
            defaultSegment={segment.slug}
            showSegment={false}
            heading="Get the briefing"
            source={cleanSource(src)}
          />
        </div>
      </section>

      {issue ? (
        <section className="wrap section">
          <div className="section-head">
            <h2>Latest issue</h2>
            <Link href={`/${segment.slug}/issues/${issue.date}`}>Read the full issue</Link>
          </div>
          <p className="meta">{issueDateline(segment.name, issue)}</p>
          <h3>{issue.subject}</h3>
          <WhatWeDo />
          {preview.map((section, index) => {
            const topic = section.topic ?? "Tool Highlights";
            const tool = section.tools[0];
            return (
              <section className="issue-section" key={topic}>
                <h2 className="section-heading">
                  <span className="section-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="section-title">{topic}</span>
                </h2>
                {tool ? (
                  <>
                    <h3>{tool.name}</h3>
                    <p>{tool.summary}</p>
                  </>
                ) : null}
              </section>
            );
          })}
          <p>
            <Link href={`/${segment.slug}/issues/${issue.date}`}>
              Read the {segmentDisplayName(segment)} issue
            </Link>
          </p>
        </section>
      ) : null}
    </>
  );
}
