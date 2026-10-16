import Link from "next/link";
import { Crumbs } from "@/components/Crumbs";
import { formatIssueDate } from "@/lib/dates";
import { resolveSlot, type SlotName } from "@/lib/email";
import { publicHref } from "@/lib/html";
import { issueSections, type Issue, type IssueSectionView, type SponsorCreative } from "@/lib/schema";
import { getSegment } from "@/lib/segments";
import { editor } from "@/lib/site";

function sectionAnchor(topic: string): string {
  const slug = topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "section";
}

function ToolSection({
  section,
  payoff,
  index,
}: {
  section: IssueSectionView;
  payoff: string;
  index: number;
}) {
  const topic = section.topic ?? "Tool Highlights";
  const number = String(index + 1).padStart(2, "0");
  return (
    <section className="issue-section">
      <h2 className="section-heading" id={sectionAnchor(topic)}>
        <span className="section-number" aria-hidden="true">
          {number}
        </span>
        <span className="section-title">{topic}</span>
      </h2>
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
      <p className="slot-name">
        <a href={publicHref(slot.creative.url)} rel={slot.house ? undefined : "sponsored"}>
          {slot.creative.name}
        </a>
      </p>
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
  const publishedLabel = formatIssueDate(issue);
  return (
    <article>
      <Crumbs
        items={[
          { name: "Vizonix", href: "/" },
          { name: segment?.name ?? issue.segment, href: `/${issue.segment}` },
          { name: "Issues", href: `/${issue.segment}/issues` },
          { name: publishedLabel },
        ]}
      />
      {issue.sample ? (
        <p className="notice">
          <strong>Sample issue.</strong> The tools and sponsor below are fictional placeholders so the
          format can be reviewed. They are not endorsements and not paid placements.
        </p>
      ) : null}
      <p className="kicker">
        {segment?.name} - {publishedLabel}
      </p>
      <h1>{issue.subject}</h1>
      <p className="meta">
        <Link href={editor.path}>{editor.name}</Link>, {editor.jobTitle}
      </p>
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
        <ToolSection
          key={section.topic ?? `tools-${index}`}
          section={section}
          payoff={payoff}
          index={index}
        />
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
