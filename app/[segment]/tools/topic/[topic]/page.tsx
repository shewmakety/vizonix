import { notFound } from "next/navigation";
import { Crumbs } from "@/components/Crumbs";
import { DirectoryBrowser } from "@/components/DirectoryBrowser";
import { JsonLd } from "@/components/JsonLd";
import { listTools } from "@/lib/content";
import { filterDirectoryTools, firstQueryValue, knownTopicKeys } from "@/lib/directory";
import { directoryViewFromQuery } from "@/lib/directory-view";
import { breadcrumbJsonLd, collectionJsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/meta";
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

export async function generateMetadata({ params, searchParams }: Props) {
  const { segment: slug, topic: topicKey } = await params;
  const query = await searchParams;
  const segment = getSegment(slug);
  const topic = segment && segment.status === "active" ? getSegmentTopic(segment, topicKey) : undefined;
  if (!segment || segment.status !== "active" || !topic) return { robots: { index: false, follow: false } };
  const heading = topicPageHeading(segment.name, topic);
  const q = firstQueryValue(query.q);
  return pageMeta({
    title: heading,
    description: topicPageDescription(segment.name, topic),
    canonical: topicPagePath(segment.slug, topic.key),
    robots: q ? { index: false, follow: true } : undefined,
  });
}

export default async function TopicToolsPage({ params, searchParams }: Props) {
  const { segment: slug, topic: topicKey } = await params;
  const query = await searchParams;
  const segment = getSegment(slug);
  const topic = segment && segment.status === "active" ? getSegmentTopic(segment, topicKey) : undefined;
  if (!segment || segment.status !== "active" || !topic) notFound();
  const heading = topicPageHeading(segment.name, topic);
  const description = topicPageDescription(segment.name, topic);
  const path = topicPagePath(segment.slug, topic.key);
  const tools = filterDirectoryTools(listTools(segment.slug), {
    topic: topic.key,
    q: firstQueryValue(query.q),
    knownKeys: knownTopicKeys(segment.topics ?? []),
  });
  const crumbs = [
    { name: "Vizonix", path: "/" },
    { name: segment.name, path: `/${segment.slug}` },
    { name: "Tool directory", path: `/${segment.slug}/tools` },
    { name: topic.label, path },
  ];

  return (
    <section className="hero">
      <div className="wrap">
        <Crumbs
          items={[
            { name: "Vizonix", href: "/" },
            { name: segment.name, href: `/${segment.slug}` },
            { name: "Tool directory", href: `/${segment.slug}/tools` },
            { name: topic.label },
          ]}
        />
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
      <JsonLd
        data={[
          collectionJsonLd({ name: heading, description, path, tools }),
          breadcrumbJsonLd(crumbs),
        ]}
      />
    </section>
  );
}
