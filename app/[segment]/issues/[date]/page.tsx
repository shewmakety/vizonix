import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { IssueBody } from "@/components/IssueBody";
import { JsonLd } from "@/components/JsonLd";
import { SiteBanner } from "@/components/SiteBanner";
import { SignupForm } from "@/components/SignupForm";
import { allIssues, getIssue } from "@/lib/content";
import { breadcrumbJsonLd, issueJsonLd } from "@/lib/jsonld";
import { getSegment } from "@/lib/segments";

type Props = { params: Promise<{ segment: string; date: string }> };

export function generateStaticParams() {
  return allIssues().map((issue) => ({ segment: issue.segment, date: issue.date }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segment: slug, date } = await params;
  const issue = getIssue(slug, date);
  const segment = getSegment(slug);
  if (!issue || !segment) return {};
  return {
    title: issue.subject,
    description: issue.preheader,
    alternates: { canonical: `/${slug}/issues/${date}` },
    robots: issue.sample ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: issue.subject,
      description: issue.preheader,
      type: "article",
      url: `/${slug}/issues/${date}`,
    },
  };
}

export default async function IssuePage({ params }: Props) {
  const { segment: slug, date } = await params;
  const segment = getSegment(slug);
  const issue = segment ? getIssue(slug, date) : undefined;
  if (!segment || !issue) notFound();

  return (
    <>
      <SiteBanner sectionName={segment.name} />
      <section className="hero">
        <div className="wrap issue-layout">
          <IssueBody issue={issue} />
          <aside className="side-card">
            <SignupForm
              defaultSegment={segment.slug}
              showSegment={false}
              heading="Get the next issue"
            />
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
            { name: "Home", path: "/" },
            { name: segment.name, path: `/${segment.slug}` },
            { name: "Issues", path: `/${segment.slug}/issues` },
            { name: issue.date, path: `/${segment.slug}/issues/${issue.date}` },
          ]),
        ]}
      />
    </>
  );
}
