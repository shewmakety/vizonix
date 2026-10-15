import { buildSegmentFeed } from "@/lib/feed";
import { segments } from "@/lib/segments";

export function generateStaticParams() {
  return segments.filter((segment) => segment.status === "active").map((segment) => ({ segment: segment.slug }));
}

export async function GET(_request: Request, context: { params: Promise<{ segment: string }> }) {
  const { segment } = await context.params;
  const xml = buildSegmentFeed(segment);
  if (!xml) return new Response("Not found", { status: 404 });
  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
