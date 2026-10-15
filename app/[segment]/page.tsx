import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SignupForm } from "@/components/SignupForm";
import { SiteBanner } from "@/components/SiteBanner";
import { listIssues, listTools } from "@/lib/content";
import { formatLongDate } from "@/lib/dates";
import { featuredSegment, getSegment, segments } from "@/lib/segments";

type Props = { params: Promise<{ segment: string }> };

export function generateStaticParams() {
  return segments.map((segment) => ({ segment: segment.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment) return {};
  if (segment.status === "planned") {
    return {
      title: segment.name,
      description: "This section is not publishing yet.",
      alternates: { canonical: `/${segment.slug}` },
      robots: { index: false, follow: false },
    };
  }
  return {
    title: segment.name,
    description: segment.summary,
    alternates: { canonical: `/${segment.slug}` },
    openGraph: { title: segment.name, description: segment.summary, url: `/${segment.slug}` },
  };
}

export default async function SegmentPage({ params }: Props) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment) notFound();
  if (segment.status === "planned") {
    const featured = featuredSegment();
    return (
      <section className="hero">
        <div className="wrap prose">
          <p className="kicker">{segment.name}</p>
          <h1>Coming soon</h1>
          <p>This section is not publishing yet.</p>
          <p>
            <Link href={`/${featured.slug}`}>{`Back to the ${featured.name.toLowerCase()} section`}</Link>.
          </p>
        </div>
      </section>
    );
  }
  const issues = listIssues(segment.slug);
  const tools = listTools(segment.slug);

  return (
    <>
      <SiteBanner sectionName={segment.name} />
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="kicker">{segment.audience}</p>
            <h1>{segment.name}</h1>
            <p className="lede">{segment.summary}</p>
            <p>{segment.promise}</p>
            <p>
              Issues stay on the site, one page per day, so a tool you saw in the morning is still
              there later. The directory is the longer record.
            </p>
            <div className="actions">
              <Link className="button" href={`/${segment.slug}/issues`}>
                Issue archive
              </Link>
              <Link className="button secondary" href={`/${segment.slug}/tools`}>
                Tool directory
              </Link>
            </div>
          </div>
          <SignupForm defaultSegment={segment.slug} showSegment={false} heading="Subscribe to Vizonix" />
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2>Recent issues</h2>
          <Link href={`/${segment.slug}/issues`}>Archive</Link>
        </div>
        {issues.length === 0 ? (
          <p className="panel">No issues yet.</p>
        ) : (
          <div className="cards">
            {issues.slice(0, 3).map((issue) => (
              <article className="card" key={issue.date}>
                {issue.sample ? <p className="pill sample">Sample issue</p> : null}
                <p className="meta">{formatLongDate(issue.date)}</p>
                <h3>
                  <Link href={`/${segment.slug}/issues/${issue.date}`}>{issue.subject}</Link>
                </h3>
                <p>{issue.lead.title}</p>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="wrap section">
        <div className="section-head">
          <h2>Tool Highlights</h2>
          <Link href={`/${segment.slug}/tools`}>Directory</Link>
        </div>
        {tools.length === 0 ? (
          <p className="panel">No tool listings yet.</p>
        ) : (
          <div className="tool-grid">
            {tools.map((tool) => (
              <article className="card" key={tool.slug}>
                {tool.sample ? <p className="pill sample">Sample listing</p> : null}
                <h3>
                  <Link href={`/${segment.slug}/tools/${tool.slug}`}>{tool.name}</Link>
                </h3>
                <p>{tool.summary}</p>
                <p className="meta">{tool.category}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
