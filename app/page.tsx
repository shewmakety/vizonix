import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";
import { listIssues, listTools } from "@/lib/content";
import { formatIssueDate } from "@/lib/dates";
import { pageMeta } from "@/lib/meta";
import { activeSegments, featuredSegment, segmentCardLabel, segmentCardPillClass, segmentDisplayName } from "@/lib/segments";
import { site } from "@/lib/site";

export const metadata = pageMeta({
  title: "Vizonix - Free daily AI briefing for business",
  absoluteTitle: true,
  description:
    "A free weekday briefing on AI tools that make a specific business more profitable. Aviation is the launch section.",
  canonical: "/",
});

export default function HomePage() {
  const featured = featuredSegment();
  const latest = listIssues(featured.slug).find((issue) => !issue.sample) ?? listIssues(featured.slug)[0];
  const tools = listTools(featured.slug).slice(0, 3);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="kicker">Free weekday morning briefing</p>
            <h1>Free daily AI briefing for a specific business.</h1>
            <p className="lede">{site.description}</p>
            <p>
              Each section covers one industry. The launch section is {featured.name}. We write up
              emerging tools, bots, models, and resources, and we say how they could change the money the
              reader keeps. The email is free. AI companies pay for labeled sponsorships.
            </p>
            <div className="actions">
              <Link className="button" href={`/${featured.slug}`}>
                Read the {featured.name.toLowerCase()} section
              </Link>
            </div>
          </div>
          <SignupForm heading="Subscribe" />
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2>One domain, one section per industry</h2>
        </div>
        <div className="cards">
          {activeSegments().map((segment) => {
            const label = segmentCardLabel(segment);
            const pillClass = segmentCardPillClass(segment);
            return (
              <article className="card" key={segment.slug}>
                <p className={pillClass}>{label}</p>
                <h3>
                  <Link href={`/${segment.slug}`}>{segmentDisplayName(segment)}</Link>
                </h3>
                <p>{segment.summary}</p>
                <p className="meta">{segment.audience}</p>
              </article>
            );
          })}
        </div>
      </section>

      {latest ? (
        <section className="wrap section">
          <div className="section-head">
            <h2>Latest from {segmentDisplayName(featured)}</h2>
            <Link href={`/${featured.slug}/issues`}>Issue archive</Link>
          </div>
          <article className="card">
            {latest.sample ? <p className="pill sample">Sample issue</p> : null}
            <p className="meta">{formatIssueDate(latest)}</p>
            <h3>
              <Link href={`/${featured.slug}/issues/${latest.date}`}>{latest.subject}</Link>
            </h3>
            <p>{latest.preheader}</p>
          </article>
        </section>
      ) : null}

      <section className="wrap section">
        <div className="section-head">
          <h2>{featured.name} tool directory</h2>
          <Link href={`/${featured.slug}/tools`}>Directory</Link>
        </div>
        <div className="cards">
          {tools.map((tool) => (
            <article className="card" key={tool.slug}>
              {tool.sample ? <p className="pill sample">Sample listing</p> : null}
              <h3>
                <Link href={`/${featured.slug}/tools/${tool.slug}`}>{tool.name}</Link>
              </h3>
              <p>{tool.summary}</p>
              <p className="meta">{tool.category}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="split">
          <div>
            <p className="kicker">How it is paid for</p>
            <h2>Three labeled sponsor slots a week.</h2>
            <p>
              A week is five weekday issues. Launch prices are published on the rate card, including a
              founding rate for the first 10 sponsors. Mentions that are not paid are not labeled as
              sponsors.
            </p>
            <Link className="button" href="/sponsor">
              Read the rate card
            </Link>
          </div>
          <div className="panel">
            <h3>What a section publishes</h3>
            <ol className="steps">
              <li>One lead story.</li>
              <li>Tools, each with a reason it could change the money.</li>
              <li>The Toolbox, organized by the same topics.</li>
              <li>Primary, secondary, and classified sponsor slots.</li>
            </ol>
          </div>
        </div>
      </section>
    </>
  );
}
