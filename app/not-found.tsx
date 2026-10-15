import type { Metadata } from "next";
import { RememberedHomeLink } from "@/components/RememberedLinks";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">404</p>
        <h1>That page is not on Vizonix.</h1>
        <p>
          <RememberedHomeLink />.
        </p>
      </div>
    </section>
  );
}
