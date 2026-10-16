import type { Metadata } from "next";
import Link from "next/link";
import {
  audienceNumbersLine,
  foundingOfferLine,
  latestIssuePath,
  mediaKitAlsoLine,
  mediaKitAudience,
  mediaKitFormats,
  mediaKitFounder,
} from "@/lib/media-kit";
import { pageMeta } from "@/lib/meta";
import { site } from "@/lib/site";

export const metadata: Metadata = pageMeta({
  title: "Media kit",
  description:
    "Vizonix sponsor media kit: audience, formats, and founding prices. Audience numbers come after the first full month.",
  canonical: "/media-kit",
});

export default function MediaKitPage() {
  const formats = mediaKitFormats();
  const latest = latestIssuePath();
  const byId = Object.fromEntries(formats.map((format) => [format.id, format]));

  return (
    <section className="hero">
      <div className="wrap prose">
        <p className="kicker">Media kit</p>
        <h1>Sponsor Vizonix</h1>
        <p className="lede">{site.description}</p>
        <p>
          <a href="/media-kit.pdf">Download the PDF</a>
        </p>

        <h2>Audience</h2>
        <p>{mediaKitAudience}</p>
        <p>{audienceNumbersLine}</p>

        <h2>Founder</h2>
        <p>{mediaKitFounder}</p>

        <h2>Formats</h2>
        <p>Layout mockups of the four placements. The price under each one comes from the rate card.</p>

        <div className="mock-grid">
          <figure className="mock">
            <figcaption>Layout mockup: newsletter primary</figcaption>
            <div className="mock-mail">
              <p className="mock-kicker">Vizonix Aviation</p>
              <div className="mock-primary">
                <p className="pill sponsored">Sponsored</p>
                <p>
                  <strong>{byId.primary.name}.</strong> {byId.primary.summary}
                </p>
                <span className="mock-cta">Primary action</span>
                <span className="mock-cta">Second action</span>
              </div>
              <p className="meta">
                {byId.primary.priceLabel}. Founding {byId.primary.foundingLabel}.
              </p>
            </div>
          </figure>

          <figure className="mock">
            <figcaption>Layout mockup: newsletter secondary</figcaption>
            <div className="mock-mail">
              <p className="mock-kicker">Mid-issue</p>
              <div className="mock-secondary">
                <p className="pill sponsored">Sponsored</p>
                <p>
                  <strong>{byId.secondary.name}.</strong> {byId.secondary.summary}
                </p>
                <span className="mock-cta">Call to action</span>
              </div>
              <p className="meta">
                {byId.secondary.priceLabel}. Founding {byId.secondary.foundingLabel}.
              </p>
            </div>
          </figure>

          <figure className="mock">
            <figcaption>Layout mockup: classified</figcaption>
            <div className="mock-mail">
              <p className="mock-classified">
                <span className="pill sponsored">Sponsored</span> {byId.classified.name}.{" "}
                {byId.classified.summary}
              </p>
              <p className="meta">
                {byId.classified.priceLabel}. Founding {byId.classified.foundingLabel}.
              </p>
            </div>
          </figure>

          <figure className="mock">
            <figcaption>Layout mockup: Featured directory listing</figcaption>
            <article className="card sponsored">
              <p className="pill sponsored">Sponsored</p>
              <p className="meta">Directory card</p>
              <h3>{byId.featured.name}</h3>
              <p>{byId.featured.summary}</p>
              <span className="mock-cta">Visit the tool</span>
            </article>
            <p className="meta">
              {byId.featured.priceLabel}. Founding {byId.featured.foundingLabel}.
            </p>
          </figure>
        </div>

        <h2>Founding pricing</h2>
        <p>{foundingOfferLine()}</p>
        <ul>
          {formats.map((format) => (
            <li key={format.id}>
              {format.name}: {format.priceLabel}, founding {format.foundingLabel}.
            </li>
          ))}
        </ul>
        <p>{mediaKitAlsoLine()}</p>
        <p>
          Prices on this page come from the <Link href="/sponsor">rate card</Link>.
        </p>

        <h2>Latest issue</h2>
        {latest ? (
          <p>
            <Link href={latest}>Latest issue</Link>
          </p>
        ) : (
          <p>The latest issue will be linked here once one is published.</p>
        )}
      </div>
    </section>
  );
}
