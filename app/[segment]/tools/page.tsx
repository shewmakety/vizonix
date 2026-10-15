import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listTools } from "@/lib/content";
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
    title: `${segment.name} tool directory`,
    description: `AI tools covered by the Vizonix ${segment.name} briefing. Sample listings are labeled.`,
    alternates: { canonical: `/${segment.slug}/tools` },
  };
}

export default async function ToolsPage({ params }: Props) {
  const { segment: slug } = await params;
  const segment = getSegment(slug);
  if (!segment) notFound();
  const tools = listTools(segment.slug);

  return (
    <section className="hero">
      <div className="wrap">
        <p className="crumbs">
          <Link href="/">Home</Link> / <Link href={`/${segment.slug}`}>{segment.name}</Link> / Tools
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
          <div className="tool-grid">
            {tools.map((tool) => (
              <article className="card" key={tool.slug}>
                {tool.sample ? <p className="pill sample">Sample listing</p> : null}
                <p className="meta">{tool.category}</p>
                <h2>
                  <Link href={`/${segment.slug}/tools/${tool.slug}`}>{tool.name}</Link>
                </h2>
                <p>{tool.summary}</p>
                {tool.company ? <p className="meta">{tool.company}</p> : null}
                {tool.bestFor ? <p className="meta">{tool.bestFor}</p> : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
