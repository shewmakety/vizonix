import Link from "next/link";
import { notFound } from "next/navigation";
import { SignupForm } from "@/components/SignupForm";
import { listIssues, listTools } from "@/lib/content";
import { formatIssueDate } from "@/lib/dates";
import { pageMeta } from "@/lib/meta";
import { activeSegments, getSegment, segmentDisplayName } from "@/lib/segments";

type Props = { params: Promise<{ segment: string }> };

export function generateStaticParams() {
  return activeSegments().map((segment) => ({ segment: segment.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment || segment.status !== "active") {
    return { robots: { index: false, follow: false } };
  }
  const title = segmentDisplayName(segment);
  return pageMeta({
    title,
    description: segment.summary,
    canonical: `/${segment.slug}`,
  });
}

export default async function SegmentPage({ params }: Props) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment || segment.status !== "active") notFound();
  const issues = listIssues(segment.slug);
  const tools = listTools(segment.slug);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="kicker">{segment.audience}</p>
            <h1>{segmentDisplayName(segment)}</h1>
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
                <p className="meta">{formatIssueDate(issue)}</p>
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
