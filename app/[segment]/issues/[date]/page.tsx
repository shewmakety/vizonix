import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueBody } from "@/components/IssueBody";
import { JsonLd } from "@/components/JsonLd";
import { SignupForm } from "@/components/SignupForm";
import { allIssues, getIssue, issueModifiedInstant } from "@/lib/content";
import { calendarInstant } from "@/lib/dates";
import { breadcrumbJsonLd, issueJsonLd } from "@/lib/jsonld";
import { capDescription, pageMeta } from "@/lib/meta";
import { getSegment, segmentDisplayName } from "@/lib/segments";
import { sectionWordmark } from "@/lib/site";

type Props = { params: Promise<{ segment: string; date: string }> };

export function generateStaticParams() {
  return allIssues().map((issue) => ({ segment: issue.segment, date: issue.date }));
}

export async function generateMetadata({ params }: Props) {
  const { segment: slug, date } = await params;
  const issue = getIssue(slug, date);
  const segment = getSegment(slug);
  if (!segment || segment.status === "planned" || !issue) return { robots: { index: false, follow: false } };
  const published = calendarInstant(issue.date);
  const modified = issueModifiedInstant(issue);
  return pageMeta({
    title: issue.subject,
    description: capDescription(issue.preheader),
    canonical: `/${slug}/issues/${date}`,
    robots: issue.sample ? { index: false, follow: true } : undefined,
    type: "article",
    publishedTime: published.toISOString(),
    modifiedTime: modified.toISOString(),
  });
}

export default async function IssuePage({ params }: Props) {
  const { segment: slug, date } = await params;
  const segment = getSegment(slug);
  const issue = segment && segment.status === "active" ? getIssue(slug, date) : undefined;
  if (!segment || segment.status !== "active" || !issue) notFound();

  return (
    <>
      <section className="hero">
        <div className="wrap issue-layout">
          <IssueBody issue={issue} />
          <aside className="side-card">
            <SignupForm defaultSegment={segment.slug} showSegment={false} heading="Get the next issue" />
            <p className="meta" style={{ marginTop: "1rem" }}>
              <Link href={`/${segment.slug}/issues`}>All {segment.name} issues</Link>
            </p>
          </aside>
        </div>
      </section>
      <JsonLd
        data={[
          issueJsonLd(issue),
          breadcrumbJsonLd([
            { name: sectionWordmark(segmentDisplayName(segment)), path: "/" },
            { name: segment.name, path: `/${segment.slug}` },
            { name: "Issues", path: `/${segment.slug}/issues` },
            { name: issue.subject, path: `/${segment.slug}/issues/${issue.date}` },
          ]),
        ]}
      />
    </>
  );
}
