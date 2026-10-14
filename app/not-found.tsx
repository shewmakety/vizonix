import Link from "next/link";
import { featuredSegment } from "@/lib/segments";

export default function NotFound() {
  const featured = featuredSegment();
  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">404</p>
        <h1>That page is not on Vizonix.</h1>
        <p>
          <Link href="/">Go to the home page</Link> or{" "}
          <Link href={`/${featured.slug}`}>open the {featured.name.toLowerCase()} section</Link>.
        </p>
      </div>
    </section>
  );
}
