import Link from "next/link";
import { formatLongDate } from "@/lib/dates";
import { resolveSlot, type SlotName } from "@/lib/email";
import { publicHref } from "@/lib/html";
import type { Issue, SponsorCreative } from "@/lib/schema";
import { getSegment } from "@/lib/segments";

function SlotView({ name, creative }: { name: SlotName; creative: SponsorCreative | null }) {
  const slot = resolveSlot(name, creative);
  return (
    <aside className={slot.house ? "slot house" : "slot paid"}>
      <p className="slot-label">
        {slot.label}
        {slot.creative.sample ? " - Sample" : ""}
      </p>
      <h3>
        <a href={publicHref(slot.creative.url)} rel={slot.house ? undefined : "sponsored"}>
          {slot.creative.name}
        </a>
      </h3>
      <p>{slot.creative.copy}</p>
      {slot.creative.sample ? (
        <p className="meta">Sample sponsor. Not a paid placement.</p>
      ) : null}
      <p className="slot-actions">
        <a href={publicHref(slot.creative.ctaUrl)} rel={slot.house ? undefined : "sponsored"}>
          {slot.creative.cta}
        </a>
        {slot.creative.ctaSecondary && slot.creative.ctaSecondaryUrl ? (
          <a href={publicHref(slot.creative.ctaSecondaryUrl)} rel="sponsored">
            {slot.creative.ctaSecondary}
          </a>
        ) : null}
      </p>
    </aside>
  );
}

export function IssueBody({ issue }: { issue: Issue }) {
  const segment = getSegment(issue.segment);
  return (
    <article>
      <p className="crumbs">
        <Link href="/">Home</Link> / <Link href={`/${issue.segment}`}>{segment?.name}</Link> /{" "}
        <Link href={`/${issue.segment}/issues`}>Issues</Link> / {formatLongDate(issue.date)}
      </p>
      {issue.sample ? (
        <p className="notice">
          <strong>Sample issue.</strong> The tools and sponsor below are fictional placeholders so the
          format can be reviewed. They are not endorsements and not paid placements.
        </p>
      ) : null}
      <p className="kicker">
        {segment?.name} · {formatLongDate(issue.date)}
      </p>
      <h1>{issue.subject}</h1>
      <p className="lede">{issue.preheader}</p>
      <SlotView name="primary" creative={issue.sponsors.primary} />
      <section>
        <p className="kicker">{issue.lead.kicker}</p>
        <h2>{issue.lead.title}</h2>
        <p>{issue.lead.summary}</p>
        <p>
          <strong>Why it can make the practice money.</strong> {issue.lead.whyItMatters}
        </p>
        <p className="meta">
          Source: <a href={publicHref(issue.lead.sourceUrl)}>{issue.lead.sourceName}</a>
        </p>
      </section>
      <section>
        <h2>New tools</h2>
        <ul className="tool-list">
          {issue.tools.map((tool) => (
            <li key={tool.slug}>
              <h3>
                <Link href={publicHref(tool.url)}>{tool.name}</Link>
              </h3>
              <p>{tool.summary}</p>
              <p>
                <strong>Why it can make the practice money.</strong> {tool.whyItMatters}
              </p>
              <p className="meta">{tool.pricing}</p>
            </li>
          ))}
        </ul>
      </section>
      <SlotView name="secondary" creative={issue.sponsors.secondary} />
      <section>
        <h2>{issue.playbook.title}</h2>
        <p>{issue.playbook.intro}</p>
        <ol className="steps">
          {issue.playbook.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
      <section>
        <h2>Quick links</h2>
        <ul className="link-list">
          {issue.quickLinks.map((link) => (
            <li key={link.url}>
              <a href={publicHref(link.url)}>{link.title}</a>
              <span className="meta"> {link.note}</span>
            </li>
          ))}
        </ul>
      </section>
      <SlotView name="classified" creative={issue.sponsors.classified} />
    </article>
  );
}
