import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DirectoryBrowser } from "@/components/DirectoryBrowser";
import { firstQueryValue } from "@/lib/directory";
import { directoryViewFromQuery } from "@/lib/directory-view";
import {
  getSegment,
  getSegmentTopic,
  segments,
  topicPageDescription,
  topicPageHeading,
  topicPagePath,
} from "@/lib/segments";

type Props = {
  params: Promise<{ segment: string; topic: string }>;
  searchParams: Promise<{ view?: string | string[]; q?: string | string[] }>;
};

export function generateStaticParams() {
  return segments.flatMap((segment) =>
    (segment.topics ?? []).map((topic) => ({ segment: segment.slug, topic: topic.key })),
  );
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { segment: slug, topic: topicKey } = await params;
  const query = await searchParams;
  const segment = getSegment(slug);
  const topic = segment ? getSegmentTopic(segment, topicKey) : undefined;
  if (!segment || !topic) return {};
  const heading = topicPageHeading(segment.name, topic);
  const description = topicPageDescription(segment.name, topic);
  const q = firstQueryValue(query.q);
  return {
    title: heading,
    description,
    alternates: { canonical: topicPagePath(segment.slug, topic.key) },
    robots: q ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title: heading,
      description,
      url: topicPagePath(segment.slug, topic.key),
    },
  };
}

export default async function TopicToolsPage({ params, searchParams }: Props) {
  const { segment: slug, topic: topicKey } = await params;
  const query = await searchParams;
  const segment = getSegment(slug);
  const topic = segment ? getSegmentTopic(segment, topicKey) : undefined;
  if (!segment || !topic) notFound();
  const heading = topicPageHeading(segment.name, topic);

  return (
    <section className="hero">
      <div className="wrap">
        <p className="crumbs">
          <Link href="/">Home</Link> / <Link href={`/${segment.slug}`}>{segment.name}</Link> /{" "}
          <Link href={`/${segment.slug}/tools`}>Tool directory</Link> / {topic.label}
        </p>
        <p className="kicker">{segment.name}</p>
        <h1>{heading}</h1>
        <p className="lede">{topic.intro}</p>
        <DirectoryBrowser
          segment={segment}
          view={directoryViewFromQuery(query.view)}
          query={firstQueryValue(query.q)}
          activeTopic={topic.key}
          linkMode="path"
        />
      </div>
    </section>
  );
}
