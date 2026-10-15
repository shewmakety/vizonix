import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolDirectory } from "@/components/ToolDirectory";
import { directoryViewFromQuery } from "@/lib/directory-view";
import { listTools } from "@/lib/content";
import { getSegment, segments } from "@/lib/segments";

type Props = {
  params: Promise<{ segment: string }>;
  searchParams: Promise<{ view?: string | string[] }>;
};

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

export default async function ToolsPage({ params, searchParams }: Props) {
  const { segment: slug } = await params;
  const query = await searchParams;
  const segment = getSegment(slug);
  if (!segment) notFound();
  const tools = listTools(segment.slug);
  const initialView = directoryViewFromQuery(query.view);

  return (
    <section className="hero">
      <div className="wrap">
        <p className="crumbs">
          <Link href="/">Home</Link> / <Link href={`/${segment.slug}`}>{segment.name}</Link> / Tool directory
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
          <ToolDirectory segmentSlug={segment.slug} tools={tools} initialView={initialView} />
        )}
      </div>
    </section>
  );
}
