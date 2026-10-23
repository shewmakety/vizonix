import type { Metadata } from "next";
import Link from "next/link";
import {
  audienceNumbersLine,
  foundingOfferLine,
  latestIssuePath,
  mediaKitAudience,
  mediaKitFormats,
  mediaKitFounder,
} from "@/lib/media-kit";
import { pageMeta } from "@/lib/meta";
import { featuredSegment } from "@/lib/segments";
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
  const sectionName = featuredSegment().name;

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
        <p>Layout mockups of the placements the issue renders. The price under each one comes from the rate card.</p>

        <div className="mock-grid">
          <figure className="mock">
            <figcaption>Layout mockup: newsletter primary</figcaption>
            <div className="mock-mail">
              <p className="mock-kicker">{sectionName}</p>
              <div className="mock-primary">
                <p className="pill sponsored">Sponsored</p>
                <p>
                  <strong>{byId.primary.name}.</strong> {byId.primary.summary}
                </p>
              </div>
              <p className="meta">
                {byId.primary.placement} {byId.primary.fields}
              </p>
              <p className="meta">
                {byId.primary.priceLabel}. Founding {byId.primary.foundingLabel}.
              </p>
            </div>
          </figure>

          <figure className="mock">
            <figcaption>Layout mockup: newsletter secondary</figcaption>
            <div className="mock-mail">
              <p className="mock-kicker">After the sections</p>
              <div className="mock-secondary">
                <p className="pill sponsored">Sponsored</p>
                <p>
                  <strong>{byId.secondary.name}.</strong> {byId.secondary.summary}
                </p>
              </div>
              <p className="meta">
                {byId.secondary.placement} {byId.secondary.fields}
              </p>
              <p className="meta">
                {byId.secondary.priceLabel}. Founding {byId.secondary.foundingLabel}.
              </p>
            </div>
          </figure>

          <figure className="mock">
            <figcaption>Layout mockup: section sponsor</figcaption>
            <div className="mock-mail">
              <p className="mock-kicker">Section 01</p>
              <div className="mock-secondary">
                <p className="pill sponsored">Section sponsor</p>
                <p>
                  <strong>{byId.section.name}.</strong> {byId.section.summary}
                </p>
              </div>
              <p className="meta">
                {byId.section.placement} {byId.section.fields}
              </p>
              <p className="meta">{byId.section.priceLabel}.</p>
            </div>
          </figure>
        </div>

        <h2>Founding pricing</h2>
        <p>{foundingOfferLine()}</p>
        <ul>
          {formats.map((format) => (
            <li key={format.id}>
              {format.quoted
                ? `${format.name}: ${format.priceLabel}.`
                : `${format.name}: ${format.priceLabel}, founding ${format.foundingLabel}.`}
            </li>
          ))}
        </ul>
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
