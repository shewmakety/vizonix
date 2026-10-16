import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/components/Crumbs";
import { JsonLd } from "@/components/JsonLd";
import { listIssues } from "@/lib/content";
import { formatPublishedInstant, issuePublishedInstant } from "@/lib/dates";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/meta";
import { getSegment, segments } from "@/lib/segments";

type Props = { params: Promise<{ segment: string }> };

export function generateStaticParams() {
  return segments.filter((segment) => segment.status === "active").map((segment) => ({ segment: segment.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment || segment.status === "planned") return { robots: { index: false, follow: false } };
  return pageMeta({
    title: `${segment.name} issue archive`,
    description: `Each weekday issue of the free ${segment.name} briefing stays on its own page.`,
    canonical: `/${segment.slug}/issues`,
  });
}

export default async function IssuesPage({ params }: Props) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment || segment.status === "planned") notFound();
  const issues = listIssues(segment.slug);
  const crumbs = [
    { name: "Vizonix", path: "/" },
    { name: segment.name, path: `/${segment.slug}` },
    { name: "Issues", path: `/${segment.slug}/issues` },
  ];

  return (
    <section className="hero">
      <div className="wrap prose">
        <Crumbs
          items={[
            { name: "Vizonix", href: "/" },
            { name: segment.name, href: `/${segment.slug}` },
            { name: "Issues" },
          ]}
        />
        <p className="kicker">{segment.name}</p>
        <h1>Issue archive</h1>
        <p>
          Each weekday issue has its own page, with the lead story, the tools, and the sources named on
          that issue. This is the {segment.name} briefing archive.
        </p>
        {issues.length === 0 ? (
          <p className="notice">No issues yet.</p>
        ) : (
          <ul className="link-list">
            {issues.map((issue) => (
              <li key={issue.date}>
                <Link href={`/${segment.slug}/issues/${issue.date}`}>{issue.subject}</Link>
                <div className="meta">
                  {formatPublishedInstant(issuePublishedInstant(issue))}
                  {issue.sample ? " - Sample issue" : ""}
                </div>
                <p>{issue.preheader}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
    </section>
  );
}
