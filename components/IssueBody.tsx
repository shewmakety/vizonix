import Link from "next/link";
import { CustomizeCard } from "@/components/CustomizeCard";
import { WhatWeDo } from "@/components/WhatWeDo";
import { resolveSlot, sectionSponsorRatesUrl, type SlotName } from "@/lib/email";
import { publicHref } from "@/lib/html";
import { sectionIconUrl, toolboxIllustrationUrl } from "@/lib/icons";
import {
  chipLabel,
  contactVendorParts,
  forwardMailto,
  issueHeaderLine,
  sectionAnchor,
  sectionHeadingLabel,
  sectionSponsorKicker,
  sectionSponsorOpenLabel,
  topStoryLabel,
  vendorWebsiteLabel,
  whyItPaysLabel,
} from "@/lib/issue-present";
import {
  issueSections,
  productivitySectionTopic,
  sortedGlossary,
  type Issue,
  type IssueSectionView,
  type IssueTool,
  type RoboticsItem,
  type SponsorCreative,
} from "@/lib/schema";
import {
  customizeLinkLabel,
  customizePitch,
  customizeWebPath,
  editor,
  preferencesPath,
  site,
  toolboxCard,
  toolboxCardCopy,
  toolboxCardIcon,
} from "@/lib/site";
import { toolboxCardHref } from "@/lib/toolbox";

function SectionIcon({ topic, size = 28 }: { topic: string | undefined; size?: number }) {
  const src = sectionIconUrl(topic, "web");
  if (!src) return null;
  return (
    <img
      className="section-icon"
      src={src}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

function WhyPays({ text }: { text: string }) {
  return (
    <p className="why-pays">
      <strong>{whyItPaysLabel}:</strong> {text}
    </p>
  );
}

function ToolTile({ tool }: { tool: IssueTool }) {
  return (
    <article className="dash-tile">
      <span className="dash-tag">AI tool</span>
      <h3>
        <Link href={publicHref(tool.url)}>{tool.name}</Link>
        {tool.company ? <span className="tile-company"> - {tool.company}</span> : null}
      </h3>
      <p>{tool.summary}</p>
      <WhyPays text={tool.whyItMatters} />
      <p className="meta">
        <PricingLine pricing={tool.pricing} vendorUrl={tool.vendorUrl} />
      </p>
      {tool.vendorUrl ? (
        <p className="meta">
          Website: <a href={publicHref(tool.vendorUrl)}>{vendorWebsiteLabel(tool.vendorUrl)}</a>
        </p>
      ) : null}
      {tool.sourceUrl ? (
        <p className="meta">
          Source: <a href={publicHref(tool.sourceUrl)}>{tool.sourceUrl}</a>
        </p>
      ) : null}
    </article>
  );
}

function PricingLine({ pricing, vendorUrl }: { pricing: string; vendorUrl?: string }) {
  const parts = vendorUrl ? contactVendorParts(pricing) : null;
  if (!parts || !vendorUrl) return pricing;
  return (
    <>
      {parts.before}
      <a href={publicHref(vendorUrl)}>{parts.phrase}</a>
      {parts.after}
    </>
  );
}

function RoboticsTile({ item }: { item: RoboticsItem }) {
  return (
    <article className="dash-tile">
      <span className="dash-tag robotics-label">Robotics</span>
      <h3>{item.headline}</h3>
      <p>{item.summary}</p>
      <WhyPays text={item.whyItMatters} />
      <p className="meta">
        Source: <a href={publicHref(item.sourceUrl)}>{item.sourceName}</a>
      </p>
    </article>
  );
}

function SectionSponsor({ section, ratesUrl }: { section: IssueSectionView; ratesUrl: string }) {
  const sponsor = section.sponsor;
  if (!sponsor) {
    return (
      <p className="section-sponsor open">
        <a href={publicHref(ratesUrl)}>{sectionSponsorOpenLabel}</a>
      </p>
    );
  }
  return (
    <aside className="section-sponsor">
      <p className="section-sponsor-kicker">{sectionSponsorKicker}</p>
      <a href={publicHref(sponsor.url)} rel="sponsored">
        {sponsor.logo ? <img src={publicHref(sponsor.logo)} alt="" width={28} height={28} /> : null}
        <span>
          <strong>{sponsor.name}</strong>
          <span className="section-sponsor-line">{sponsor.line}</span>
        </span>
      </a>
    </aside>
  );
}

function ToolSection({
  section,
  index,
  ratesUrl,
}: {
  section: IssueSectionView;
  index: number;
  ratesUrl: string;
}) {
  const topic = section.topic ?? "Tool Highlights";
  const number = String(index + 1).padStart(2, "0");
  const productivity = topic === productivitySectionTopic;
  return (
    <section className={productivity ? "issue-section productivity" : "issue-section"} id={sectionAnchor(topic)}>
      <h2 className="section-heading">
        <span className="section-number" aria-hidden="true">
          {number}
        </span>
        <SectionIcon topic={topic} size={productivity ? 36 : 28} />
        <span className="section-title">{sectionHeadingLabel(topic)}</span>
      </h2>
      <SectionSponsor section={section} ratesUrl={ratesUrl} />
      {section.coverageNote ? <p className="notice">{section.coverageNote}</p> : null}
      {section.intro ? (
        <p className="section-intro">
          {section.intro}
          {section.introSourceUrl ? (
            <>
              {" "}
              Source: <a href={publicHref(section.introSourceUrl)}>{section.introSourceUrl}</a>
            </>
          ) : null}
        </p>
      ) : null}
      <div className="dash-grid">
        {section.robotics ? <RoboticsTile item={section.robotics} /> : null}
        {section.tools.map((tool) => (
          <ToolTile key={tool.slug} tool={tool} />
        ))}
      </div>
    </section>
  );
}

function GlossaryView({ issue }: { issue: Issue }) {
  const entries = sortedGlossary(issue.glossary);
  if (entries.length === 0) return null;
  return (
    <section className="glossary">
      <h2 className="glossary-heading">AI Glossary</h2>
      <table className="glossary-table">
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.term}>
              <td className="glossary-term">{entry.term}</td>
              <td className="glossary-definition">{entry.definition}</td>
            </tr>
          ))}
        </tbody>
      </table>
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
      {slot.creative.sample ? <p className="meta">Sample sponsor. Not a paid placement.</p> : null}
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

function ToolboxCard({ segment }: { segment: string }) {
  const href = toolboxCardHref(segment, "issue");
  if (!href) return null;
  return (
    <aside className="issue-toolbox">
      <img
        src={toolboxIllustrationUrl("web")}
        alt=""
        width={toolboxCardIcon.width}
        height={toolboxCardIcon.height}
      />
      <h2>{toolboxCard.heading}</h2>
      <p>{toolboxCardCopy(segment)}</p>
      <a className="button" href={href}>
        {toolboxCard.button}
      </a>
    </aside>
  );
}

function IssueActions({ issue }: { issue: Issue }) {
  return (
    <p className="issue-actions">
      <a href="/join">SUBSCRIBE</a>
      <span className="issue-action-sep"> • </span>
      <wbr />
      <a href={forwardMailto(issue)}>FORWARD TO A COLLEAGUE</a>
      <span className="issue-action-sep"> • </span>
      <wbr />
      <a href={`/${issue.segment}/issues/${issue.date}`}>READ ON WEB</a>
      <span className="issue-action-sep"> • </span>
      <wbr />
      <a href={preferencesPath}>CUSTOMIZE</a>
    </p>
  );
}

export function IssueBody({ issue }: { issue: Issue }) {
  const sections = issueSections(issue);
  const ratesUrl = sectionSponsorRatesUrl(issue);
  return (
    <article className="dashboard">
      <header className="issue-masthead">
        <div className="wrap dashboard-wrap">
          <h1 className="issue-title">{issue.subject}</h1>
          <p className="issue-dateline">{issueHeaderLine(issue)}</p>
          <p className="issue-customize">
            {customizePitch} <a href={customizeWebPath}>{customizeLinkLabel}</a>
          </p>
          <IssueActions issue={issue} />
        </div>
      </header>
      <div className="wrap dashboard-wrap dashboard-body">
        {issue.sample ? (
          <p className="notice">
            <strong>Sample issue.</strong> The tools and sponsor below are fictional placeholders so the format
            can be reviewed. They are not endorsements and not paid placements.
          </p>
        ) : null}
        <p className="jump-label">Jump to</p>
        <nav className="jump-row" aria-label="Jump to">
          {sections.map((section, index) => {
            const topic = section.topic ?? "Tool Highlights";
            const number = String(index + 1).padStart(2, "0");
            return (
              <a
                key={topic}
                className="jump-chip"
                href={`#${sectionAnchor(topic)}`}
              >
                <b>{number}</b> {sectionHeadingLabel(chipLabel(topic))}
              </a>
            );
          })}
        </nav>
        <SlotView name="primary" creative={issue.sponsors.primary} />
        <div className="dash-hero">
          <WhatWeDo />
          <CustomizeCard />
          <section className="top-story">
            <p className="top-kicker">
              <SectionIcon topic={issue.lead.kicker} size={28} />
              <span>{topStoryLabel}</span>
            </p>
            <h2>{issue.lead.title}</h2>
            <p>{issue.lead.summary}</p>
            <WhyPays text={issue.lead.whyItMatters} />
            <p className="meta">
              Source: <a href={publicHref(issue.lead.sourceUrl)}>{issue.lead.sourceName}</a>
            </p>
            {issue.lead.productUrl ? (
              <p className="meta">
                Product: <a href={publicHref(issue.lead.productUrl)}>{issue.lead.productUrl}</a>
              </p>
            ) : null}
          </section>
        </div>
        {sections.map((section, index) => (
          <ToolSection key={section.topic ?? `tools-${index}`} section={section} index={index} ratesUrl={ratesUrl} />
        ))}
        <SlotView name="secondary" creative={issue.sponsors.secondary} />
        <SlotView name="classified" creative={issue.sponsors.classified} />
        <ToolboxCard segment={issue.segment} />
        <GlossaryView issue={issue} />
        <IssueActions issue={issue} />
        <p className="meta">
          <Link href={editor.path}>{editor.name}</Link>, {editor.jobTitle}
          {" · "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
    </article>
  );
}
