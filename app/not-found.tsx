import type { Metadata } from "next";
import Link from "next/link";
import { cookies, headers } from "next/headers";
import { SEGMENT_COOKIE, SEGMENT_HEADER, resolveRememberedSlug, segmentHomeHref } from "@/lib/segment-memory";
import { featuredSegment, getSegment } from "@/lib/segments";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const headerStore = await headers();
  const cookieStore = await cookies();
  const rememberedSlug = resolveRememberedSlug(
    headerStore.get(SEGMENT_HEADER),
    cookieStore.get(SEGMENT_COOKIE)?.value,
  );
  const home = segmentHomeHref("/404", rememberedSlug);
  const segment = getSegment(home.slice(1)) ?? featuredSegment();
  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">404</p>
        <h1>That page is not on Vizonix.</h1>
        <p>
          <Link href={home}>Go to the {segment.name.toLowerCase()} home page</Link>.
        </p>
      </div>
    </section>
  );
}
