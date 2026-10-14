import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listIssues } from "@/lib/content";
import { formatLongDate } from "@/lib/dates";
import { getSegment, segments } from "@/lib/segments";

type Props = { params: Promise<{ segment: string }> };

export function generateStaticParams() {
  return segments.map((segment) => ({ segment: segment.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment) return {};
  return {
    title: `${segment.name} issues`,
    description: `Archive of the Vizonix ${segment.name} briefing.`,
    alternates: { canonical: `/${segment.slug}/issues` },
  };
}

export default async function IssuesPage({ params }: Props) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment) notFound();
  const issues = listIssues(segment.slug);

  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="crumbs">
          <Link href="/">Home</Link> / <Link href={`/${segment.slug}`}>{segment.name}</Link> / Issues
        </p>
        <p className="kicker">{segment.name}</p>
        <h1>Issue archive</h1>
        <p>
          Each weekday issue has its own page. Sample issues are labeled and are not offered as real
          coverage.
        </p>
        {issues.length === 0 ? (
          <p className="notice">No issues yet. This section is not publishing yet.</p>
        ) : (
          <ul className="link-list">
            {issues.map((issue) => (
              <li key={issue.date}>
                <Link href={`/${segment.slug}/issues/${issue.date}`}>{issue.subject}</Link>
                <div className="meta">
                  {formatLongDate(issue.date)}
                  {issue.sample ? " - Sample issue" : ""}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
