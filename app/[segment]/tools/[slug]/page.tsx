import Link from "next/link";
import { notFound } from "next/navigation";
import { Crumbs } from "@/components/Crumbs";
import { JsonLd } from "@/components/JsonLd";
import { allTools, getTool, listTools } from "@/lib/content";
import { configuredTopicsForTool } from "@/lib/directory";
import { breadcrumbJsonLd, toolJsonLd } from "@/lib/jsonld";
import { pageMeta } from "@/lib/meta";
import { formatPublishedInstant, issuePublishedInstant } from "@/lib/dates";
import { getSegment, segmentTopics, topicPagePath } from "@/lib/segments";
import { issuesMentioningTool, relatedTools, toolPageTitle } from "@/lib/tool-page";

type Props = { params: Promise<{ segment: string; slug: string }> };

export function generateStaticParams() {
  return allTools().map((tool) => ({ segment: tool.segment, slug: tool.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { segment: slug, slug: toolSlug } = await params;
  const tool = getTool(slug, toolSlug);
  const segment = getSegment(slug);
  if (!segment || segment.status === "planned" || !tool) return { robots: { index: false, follow: false } };
  const title = toolPageTitle(tool, segment, listTools(slug));
  const description = tool.sample ? `Sample listing. ${tool.summary}` : tool.summary;
  return pageMeta({
    title,
    description,
    canonical: `/${slug}/tools/${tool.slug}`,
    robots: tool.sample ? { index: false, follow: true } : undefined,
  });
}

export default async function ToolPage({ params }: Props) {
  const { segment: slug, slug: toolSlug } = await params;
  const segment = getSegment(slug);
  const tool = segment && segment.status === "active" ? getTool(slug, toolSlug) : undefined;
  if (!segment || segment.status !== "active" || !tool || toolSlug === "topic") notFound();
  const topics = configuredTopicsForTool(segmentTopics(segment), tool);
  const topicCrumb = topics.length === 1 ? topics[0] : undefined;
  const peers = listTools(segment.slug);
  const related = relatedTools(tool, peers);
  const mentioned = issuesMentioningTool(segment.slug, tool.slug);
  const crumbs = [
    { name: "Vizonix", path: "/" },
    { name: segment.name, path: `/${segment.slug}` },
    { name: "Tool directory", path: `/${segment.slug}/tools` },
    ...(topicCrumb ? [{ name: topicCrumb.label, path: topicPagePath(segment.slug, topicCrumb.key) }] : []),
    { name: tool.name, path: `/${segment.slug}/tools/${tool.slug}` },
  ];

  return (
    <>
      <section className="hero">
        <div className="wrap prose">
          <Crumbs
            items={crumbs.map((crumb, index) => ({
              name: crumb.name,
              href: index === crumbs.length - 1 ? undefined : crumb.path,
            }))}
          />
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
          {related.length > 0 ? (
            <section>
              <h2>Related tools</h2>
              <ul className="link-list">
                {related.map((item) => (
                  <li key={item.slug}>
                    <Link href={`/${segment.slug}/tools/${item.slug}`}>{item.name}</Link>
                    {item.company ? <span className="meta"> {item.company}</span> : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {mentioned.length > 0 ? (
            <section>
              <h2>Mentioned in</h2>
              <ul className="link-list">
                {mentioned.map((issue) => (
                  <li key={issue.date}>
                    <Link href={`/${segment.slug}/issues/${issue.date}`}>{issue.subject}</Link>
                    <div className="meta">{formatPublishedInstant(issuePublishedInstant(issue))}</div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          <p>
            <Link href={`/${segment.slug}/tools`}>Back to the {segment.name} directory</Link>
          </p>
        </div>
      </section>
      <JsonLd data={[toolJsonLd(tool), breadcrumbJsonLd(crumbs)]} />
    </>
  );
}
