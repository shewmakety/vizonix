import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectoryBrowser } from "@/components/DirectoryBrowser";
import { listTools } from "@/lib/content";
import { directoryCanonical, firstQueryValue, otherTopicKey } from "@/lib/directory";
import { directoryViewFromQuery } from "@/lib/directory-view";
import { getSegment, getSegmentTopic, segments } from "@/lib/segments";

type Props = {
  params: Promise<{ segment: string }>;
  searchParams: Promise<{ view?: string | string[]; topic?: string | string[]; q?: string | string[] }>;
};

export function generateStaticParams() {
  return segments.filter((segment) => segment.status === "active").map((segment) => ({ segment: segment.slug }));
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { segment: slug } = await params;
  const query = await searchParams;
  const segment = getSegment(slug);
  if (!segment || segment.status === "planned") return { robots: { index: false, follow: false } };
  const topicKey = firstQueryValue(query.topic);
  const q = firstQueryValue(query.q);
  const known = topicKey === otherTopicKey || !topicKey || Boolean(getSegmentTopic(segment, topicKey));
  return {
    title: `${segment.name} tool directory`,
    description: `AI tools covered by the Vizonix ${segment.name} briefing. Sample listings are labeled.`,
    alternates: {
      canonical: known ? directoryCanonical(segment, topicKey || undefined) : `/${segment.slug}/tools`,
    },
    robots: q ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export default async function ToolsPage({ params, searchParams }: Props) {
  const { segment: slug } = await params;
  const query = await searchParams;
  const segment = getSegment(slug);
  if (!segment || segment.status === "planned") notFound();
  const topicKey = firstQueryValue(query.topic);
  if (topicKey && topicKey !== otherTopicKey && !getSegmentTopic(segment, topicKey)) notFound();
  const tools = listTools(segment.slug);
  const q = firstQueryValue(query.q);

  return (
    <section className="hero">
      <div className="wrap">
        <p className="crumbs">
          <Link href={`/${segment.slug}`}>Home</Link> / <Link href={`/${segment.slug}`}>{segment.name}</Link> / Tool directory
        </p>
        <p className="kicker">{segment.name}</p>
        <h1>Tool directory</h1>
        <p className="lede">
          Each tool has its own page: what it does, who it is for, and how it could change the money.
          Featured listings, when a sponsor buys one, are labeled Sponsored. Sample listings are
          fictional.
        </p>
        {tools.length === 0 ? (
          <p className="notice">No tool listings yet. This section is not publishing yet.</p>
        ) : (
          <DirectoryBrowser
            segment={segment}
            view={directoryViewFromQuery(query.view)}
            query={q}
            activeTopic={topicKey || undefined}
            linkMode="query"
          />
        )}
      </div>
    </section>
  );
}
