import Link from "next/link";
import { WhatWeDo } from "@/components/WhatWeDo";
import { issueDateline } from "@/lib/dates";
import { sectionIconUrl } from "@/lib/icons";
import { issueSections, type Issue } from "@/lib/schema";
import { getSegment } from "@/lib/segments";

function PreviewIcon({ topic }: { topic: string }) {
  const src = sectionIconUrl(topic, "web");
  if (!src) return null;
  return <img className="section-icon" src={src} alt="" width={40} height={40} />;
}

/** Title, What We Do, and the first sections of the latest issue. */
export function JoinPreview({ issue }: { issue: Issue }) {
  const segment = getSegment(issue.segment);
  const sectionName = segment?.name ?? issue.segment;
  const sections = issueSections(issue).slice(0, 2);
  return (
    <section className="wrap section join-preview">
      <p className="kicker">Latest issue</p>
      <h2>{issue.subject}</h2>
      <p className="meta">{issueDateline(sectionName, issue)}</p>
      <WhatWeDo />
      {sections.map((section, index) => {
        const topic = section.topic ?? "Section";
        const number = String(index + 1).padStart(2, "0");
        const blurb = section.intro || section.tools[0]?.summary;
        return (
          <section className="issue-section" key={topic}>
            <h2 className="section-heading">
              <PreviewIcon topic={topic} />
              <span className="section-number" aria-hidden="true">
                {number}
              </span>
              <span className="section-title">{topic}</span>
            </h2>
            {blurb ? <p>{blurb}</p> : null}
          </section>
        );
      })}
      <p>
        <Link href={`/${issue.segment}/issues/${issue.date}`}>Read the full issue</Link>
      </p>
    </section>
  );
}
