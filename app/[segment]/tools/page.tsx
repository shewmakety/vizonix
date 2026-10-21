import { notFound, permanentRedirect } from "next/navigation";
import { Crumbs } from "@/components/Crumbs";
import { DirectoryBrowser } from "@/components/DirectoryBrowser";
import { JsonLd } from "@/components/JsonLd";
import { listTools } from "@/lib/content";
import { directoryCanonical, firstQueryValue, knownTopicKeys, otherTopicKey } from "@/lib/directory";
import { directoryViewFromQuery } from "@/lib/directory-view";
import { todayInNewYork } from "@/lib/dates";
import { presentDirectory } from "@/lib/featured";
import { breadcrumbJsonLd, collectionJsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/meta";
import { getSegment, getSegmentTopic, segmentDisplayName, segments } from "@/lib/segments";

type Props = {
  params: Promise<{ segment: string }>;
  searchParams: Promise<{ view?: string | string[]; topic?: string | string[]; q?: string | string[] }>;
};

export function generateStaticParams() {
  return segments.filter((segment) => segment.status === "active").map((segment) => ({ segment: segment.slug }));
}

export async function generateMetadata({ params, searchParams }: Props) {
  const { segment: slug } = await params;
  const query = await searchParams;
  const segment = getSegment(slug);
  if (!segment || segment.status === "planned") return { robots: { index: false, follow: false } };
  const topicKey = firstQueryValue(query.topic);
  const q = firstQueryValue(query.q);
  const known = topicKey === otherTopicKey || !topicKey || Boolean(getSegmentTopic(segment, topicKey));
  const count = listTools(segment.slug).filter((tool) => !tool.sample).length;
  const title =
    segment.slug === "aviation"
      ? `${count} AI tools for aviation: MRO, AOG, parts, and flight ops`
      : `${count} AI tools for ${segment.name}`;
  return pageMeta({
    title,
    description: `Directory of AI tools covered by the Vizonix ${segmentDisplayName(segment)} briefing, each with its own page.`,
    canonical: known ? directoryCanonical(segment, topicKey || undefined) : `/${segment.slug}/tools`,
    robots: q ? { index: false, follow: true } : undefined,
  });
}

export default async function ToolsPage({ params, searchParams }: Props) {
  const { segment: slug } = await params;
  if (slug === "aviation") permanentRedirect("/aviation/toolbox");
  const query = await searchParams;
  const segment = getSegment(slug);
  if (!segment || segment.status === "planned") notFound();
  const topicKey = firstQueryValue(query.topic);
  if (topicKey && topicKey !== otherTopicKey && !getSegmentTopic(segment, topicKey)) notFound();
  const tools = listTools(segment.slug);
  const q = firstQueryValue(query.q);
  const presented = presentDirectory(tools, {
    topic: topicKey || undefined,
    q,
    knownKeys: knownTopicKeys(segment.topics ?? []),
    today: todayInNewYork(),
  });
  const title =
    segment.slug === "aviation"
      ? `${presented.tools.length} AI tools for aviation: MRO, AOG, parts, and flight ops`
      : `${segment.name} tool directory`;
  const description = `Directory of AI tools covered by the Vizonix ${segmentDisplayName(segment)} briefing, each with its own page.`;
  const crumbs = [
    { name: "Vizonix", path: "/" },
    { name: segment.name, path: `/${segment.slug}` },
    { name: "Tool directory", path: `/${segment.slug}/tools` },
  ];

  return (
    <section className="hero">
      <div className="wrap">
        <Crumbs
          items={[
            { name: "Vizonix", href: "/" },
            { name: segment.name, href: `/${segment.slug}` },
            { name: "Tool directory" },
          ]}
        />
        <p className="kicker">{segment.name}</p>
        <h1>Tool directory</h1>
        <p className="lede">
          Each tool has its own page: what it does, who it is for, and how it could change the money.
          Featured listings, when a sponsor buys one, are labeled Sponsored.
        </p>
        {tools.length === 0 ? (
          <p className="notice">No tool listings yet.</p>
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
      <JsonLd
        data={[
          collectionJsonLd({
            name: title,
            description,
            path: `/${segment.slug}/tools`,
            tools: presented.tools,
            sponsoredSlugs: presented.sponsoredSlugs,
          }),
          breadcrumbJsonLd(crumbs),
        ]}
      />
    </section>
  );
}
