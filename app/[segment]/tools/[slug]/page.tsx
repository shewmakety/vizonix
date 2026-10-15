import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { SiteBanner } from "@/components/SiteBanner";
import { allTools, getTool } from "@/lib/content";
import { configuredTopicsForTool } from "@/lib/directory";
import { breadcrumbJsonLd, toolJsonLd } from "@/lib/jsonld";
import { getSegment, segmentTopics, topicPagePath } from "@/lib/segments";

type Props = { params: Promise<{ segment: string; slug: string }> };

export function generateStaticParams() {
  return allTools().map((tool) => ({ segment: tool.segment, slug: tool.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { segment: slug, slug: toolSlug } = await params;
  const tool = getTool(slug, toolSlug);
  const segment = getSegment(slug);
  if (!tool || !segment) return {};
  const description = tool.sample
    ? `Sample listing. ${tool.summary}`
    : tool.summary;
  return {
    title: tool.name,
    description,
    alternates: { canonical: `/${slug}/tools/${tool.slug}` },
    robots: tool.sample ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title: tool.name, description, url: `/${slug}/tools/${tool.slug}` },
  };
}

export default async function ToolPage({ params }: Props) {
  const { segment: slug, slug: toolSlug } = await params;
  const segment = getSegment(slug);
  const tool = segment ? getTool(slug, toolSlug) : undefined;
  if (!segment || !tool || toolSlug === "topic") notFound();
  const topics = configuredTopicsForTool(segmentTopics(segment), tool);
  const topicCrumb = topics.length === 1 ? topics[0] : undefined;

  return (
    <>
      {segment.status === "active" ? <SiteBanner sectionName={segment.name} /> : null}
      <section className="hero">
        <div className="wrap prose">
          <p className="crumbs">
            <Link href={`/${segment.slug}`}>Home</Link> / <Link href={`/${segment.slug}`}>{segment.name}</Link> /{" "}
            <Link href={`/${segment.slug}/tools`}>Tool directory</Link>
            {topicCrumb ? (
              <>
                {" / "}
                <Link href={topicPagePath(segment.slug, topicCrumb.key)}>{topicCrumb.label}</Link>
              </>
            ) : null}{" "}
            / {tool.name}
          </p>
          {tool.sample ? (
            <p className="notice">
              <strong>Sample listing.</strong> {tool.name} is fictional. It is here so the directory
              format can be reviewed. It is not an endorsement and not a paid placement.
            </p>
          ) : null}
          <p className="kicker">{tool.category}</p>
          <h1>{tool.name}</h1>
          {tool.company ? <p className="meta">{tool.company}</p> : null}
          {topics.length > 0 ? (
            <p className="meta">
              Topic:{" "}
              {topics.map((topic, index) => (
                <span key={topic.key}>
                  {index > 0 ? ", " : null}
                  <Link href={topicPagePath(segment.slug, topic.key)}>{topic.label}</Link>
                </span>
              ))}
            </p>
          ) : null}
          <p className="lede">{tool.summary}</p>
          {tool.paragraphs
            .filter((paragraph) => paragraph !== tool.summary)
            .map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          <h2>{segment.payoffLabel}</h2>
          <p>{tool.whyItMatters}</p>
          <dl className="facts">
            {tool.bestFor ? (
              <>
                <dt>Best for</dt>
                <dd>{tool.bestFor}</dd>
              </>
            ) : null}
            <dt>Pricing</dt>
            <dd>{tool.pricing}</dd>
            <dt>External link</dt>
            <dd>
              <a href={tool.url} rel="noopener noreferrer">
                {tool.url}
              </a>
            </dd>
            {tool.sourceUrl && tool.sourceUrl !== tool.url ? (
              <>
                <dt>Source</dt>
                <dd>
                  <a href={tool.sourceUrl} rel="noopener noreferrer">
                    {tool.sourceUrl}
                  </a>
                </dd>
              </>
            ) : null}
          </dl>
          <p>
            <Link href={`/${segment.slug}/tools`}>Back to the {segment.name} directory</Link>
          </p>
        </div>
      </section>
      <JsonLd
        data={[
          toolJsonLd(tool),
          breadcrumbJsonLd([
            { name: "Home", path: `/${segment.slug}` },
            { name: segment.name, path: `/${segment.slug}` },
            { name: "Tool directory", path: `/${segment.slug}/tools` },
            ...(topicCrumb
              ? [{ name: topicCrumb.label, path: topicPagePath(segment.slug, topicCrumb.key) }]
              : []),
            { name: tool.name, path: `/${segment.slug}/tools/${tool.slug}` },
          ]),
        ]}
      />
    </>
  );
}
