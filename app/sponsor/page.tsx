import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { SponsorCheckoutForm } from "@/components/SponsorCheckoutForm";
import { loadReservations, publicReservations } from "@/lib/bookings";
import { formatLongDate } from "@/lib/dates";
import { sponsorFaqJsonLd } from "@/lib/jsonld";
import {
  classifiedRatio,
  exclusivityPremium,
  formatUsd,
  foundingSponsorCap,
  getPlacement,
  launchPlacements,
  loyaltyDiscount,
  maxNewsletterSponsors,
  primaryLadder,
  scaledFromPrimary,
  secondaryRatio,
  stripeLinkEnvKey,
} from "@/lib/rate-card";
import { pageMeta } from "@/lib/meta";
import { featuredSegment, segments } from "@/lib/segments";

export const dynamic = "force-dynamic";

export const metadata = pageMeta({
  title: "Sponsor",
  description:
    "Vizonix launch rate card. Aviation is the first list. Primary, secondary, and classified sponsorships, plus the founding offer.",
  canonical: "/sponsor",
});

export default async function SponsorPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const featured = featuredSegment();
  const otherLive = segments.filter(
    (segment) => segment.status === "active" && segment.slug !== featured.slug,
  );
  const reserved = publicReservations(await loadReservations());
  const links = segments
    .filter((segment) => segment.status === "active")
    .flatMap((segment) =>
      launchPlacements.map((placement) => {
        const href = process.env[stripeLinkEnvKey(segment.slug, placement.id)];
        return href ? { segment, placement, href } : null;
      }),
    )
    .filter(
      (item): item is { segment: (typeof segments)[number]; placement: (typeof launchPlacements)[number]; href: string } =>
        Boolean(item),
    );

  return (
    <section className="hero">
      <div className="wrap">
        <p className="kicker">Rate card</p>
        <h1>Sponsor the {featured.name.toLowerCase()} briefing.</h1>
        <p className="lede">
          A week is five weekday issues, Monday through Friday, of one section. {featured.name} is the
          launch list. Launch prices below are for a section with 0-2,500 subscribers. The archive
          listing stays on the site.
        </p>
        {otherLive.length > 0 ? (
          <p>
            The same launch prices apply to {otherLive.map((segment) => segment.name).join(" and ")},
            which {otherLive.length === 1 ? "is" : "are"} also live. Pick the section in checkout.
          </p>
        ) : null}
        {status === "cancelled" ? (
          <p className="notice">Checkout was cancelled. No charge was made.</p>
        ) : null}

        <h2>Launch placements</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Placement</th>
                <th>What you get</th>
                <th>Weekly price</th>
                <th>Founding price</th>
              </tr>
            </thead>
            <tbody>
              {launchPlacements.map((placement) => (
                <tr key={placement.id}>
                  <td>{placement.name}</td>
                  <td>{placement.description}</td>
                  <td className="num">
                    {formatUsd(placement.price)}
                    {placement.unit === "month" ? " / month" : ""}
                  </td>
                  <td className="num">
                    {formatUsd(placement.founding)}
                    {placement.unit === "month" ? " / month" : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="form-note">
          Maximum {maxNewsletterSponsors} newsletter sponsors per issue. Exclusivity, the only sponsor
          that week, is {exclusivityPremium * 100}% more. Founding price: the first {foundingSponsorCap}{" "}
          sponsors, locked for 3 months, then the current tier with a {loyaltyDiscount * 100}% loyalty
          discount for 3 more months.
        </p>

        <h2>Founding sponsor offer</h2>
        <p>
          The founding rate is half the launch price. It is for the first {foundingSponsorCap} sponsors
          and stays in place for 3 months of bookings. After that, the sponsor moves to whatever
          subscriber tier the section is in, with a {loyaltyDiscount * 100}% loyalty discount for 3 more
          months. Check the founding box in checkout. If Stripe still shows the full price, enter the
          code FOUNDING.
        </p>
        <p>
          After the first 4 weeks of sending, we will set a click bar. If a paid week comes in under
          that bar, the sponsor gets a makeup week. The bar is not set yet, and we will not invent a
          number for it.
        </p>

        <h2>Price ladder</h2>
        <p>
          Primary slot, per week. Secondary is {secondaryRatio * 100}% of primary. Classified is{" "}
          {classifiedRatio * 100}% of primary. The 0-1,000 row is a floor, so the per-subscriber figure
          is not meaningful there. Open rate and audience makeup will be published on this page once a
          month of {featured.name.toLowerCase()} issues has been sent. Those figures are not published
          yet.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Active subscribers</th>
                <th>Primary / week</th>
                <th>Secondary</th>
                <th>Classified</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {primaryLadder.map((row) => (
                <tr key={row.label}>
                  <td>{row.label}</td>
                  <td className="num">{row.primary === null ? "Quote" : formatUsd(row.primary)}</td>
                  <td className="num">
                    {row.primary === null
                      ? "60% of primary"
                      : formatUsd(scaledFromPrimary(row.primary, secondaryRatio))}
                  </td>
                  <td className="num">
                    {row.primary === null
                      ? "35% of primary"
                      : formatUsd(scaledFromPrimary(row.primary, classifiedRatio))}
                  </td>
                  <td>{row.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="split" style={{ marginTop: "2rem" }}>
          <SponsorCheckoutForm />
          <div>
            <h2>Reserved weeks</h2>
            {reserved.length === 0 ? (
              <p>No paid reservations are on the books yet.</p>
            ) : (
              <ul className="link-list">
                {reserved.map((row) => (
                  <li key={`${row.segment}-${row.placement}-${row.startDate}`}>
                    {getPlacement(row.placement)?.name ?? row.placement} in{" "}
                    {segments.find((segment) => segment.slug === row.segment)?.name ?? row.segment}
                    <div className="meta">
                      {formatLongDate(row.startDate)} through {formatLongDate(row.endDate)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {links.length > 0 ? (
              <>
                <h3>Payment links</h3>
                <p className="form-note">
                  These Stripe Payment Links are optional. Put the preferred week in the custom field
                  named preferred_week, as YYYY-MM-DD, and set segment and placement if the link asks.
                </p>
                <ul className="link-list">
                  {links.map((item) => (
                    <li key={`${item.segment.slug}-${item.placement.id}`}>
                      <a href={item.href}>
                        {item.segment.name}: {item.placement.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="form-note">
                Payment Links are optional. If checkout is not connected yet, use the form on this page
                with the placement and the Monday you want.
              </p>
            )}
            <p>Questions about a bundle or a multi-week run: use the form on this page.</p>
          </div>
        </div>
      </div>
      <JsonLd data={sponsorFaqJsonLd()} />
    </section>
  );
}
