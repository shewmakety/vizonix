import Link from "next/link";
import { formatLongDate } from "@/lib/dates";
import { resolveSlot, type SlotName } from "@/lib/email";
import { publicHref } from "@/lib/html";
import { issueSections, type Issue, type IssueSectionView, type SponsorCreative } from "@/lib/schema";
import { getSegment } from "@/lib/segments";

function ToolSection({ section, payoff }: { section: IssueSectionView; payoff: string }) {
  return (
    <section>
      <h2>{section.topic ?? "New tools"}</h2>
      {section.coverageNote ? <p className="notice">{section.coverageNote}</p> : null}
      {section.intro ? (
        <p>
          {section.intro}
          {section.introSourceUrl ? (
            <>
              {" "}
              Source: <a href={publicHref(section.introSourceUrl)}>{section.introSourceUrl}</a>
            </>
          ) : null}
        </p>
      ) : null}
      <ul className="tool-list">
        {section.tools.map((tool) => (
          <li key={tool.slug}>
            <h3>
              <Link href={publicHref(tool.url)}>{tool.name}</Link>
            </h3>
            {tool.company ? <p className="meta">{tool.company}</p> : null}
            <p>{tool.summary}</p>
            <p>
              <strong>{payoff}.</strong> {tool.whyItMatters}
            </p>
            <p className="meta">{tool.pricing}</p>
            {tool.sourceUrl ? (
              <p className="meta">
                Source: <a href={publicHref(tool.sourceUrl)}>{tool.sourceUrl}</a>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

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
          <a href={publicHref(slot.creative.ctaSecondaryUrl)} rel={slot.house ? undefined : "sponsored"}>
            {slot.creative.ctaSecondary}
          </a>
        ) : null}
      </p>
    </aside>
  );
}

export function IssueBody({ issue }: { issue: Issue }) {
  const segment = getSegment(issue.segment);
  const payoff = segment?.payoffLabel ?? "Why it matters";
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
        {segment?.name} - {formatLongDate(issue.date)}
      </p>
      <h1>{issue.subject}</h1>
      <p className="lede">{issue.preheader}</p>
      <SlotView name="primary" creative={issue.sponsors.primary} />
      <section>
        <p className="kicker">{issue.lead.kicker}</p>
        <h2>{issue.lead.title}</h2>
        <p>{issue.lead.summary}</p>
        <p>
          <strong>{payoff}.</strong> {issue.lead.whyItMatters}
        </p>
        <p className="meta">
          Source: <a href={publicHref(issue.lead.sourceUrl)}>{issue.lead.sourceName}</a>
        </p>
        {issue.lead.productUrl ? (
          <p className="meta">
            Product: <a href={publicHref(issue.lead.productUrl)}>{issue.lead.productUrl}</a>
          </p>
        ) : null}
      </section>
      {issueSections(issue).map((section, index) => (
        <ToolSection key={section.topic ?? `tools-${index}`} section={section} payoff={payoff} />
      ))}
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
