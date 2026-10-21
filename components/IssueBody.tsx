import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";
import { WhatWeDo } from "@/components/WhatWeDo";
import { formatIsoDay } from "@/lib/dates";
import { resolveSlot, sectionSponsorRatesUrl, type SlotName } from "@/lib/email";
import { publicHref } from "@/lib/html";
import { sectionIconUrl } from "@/lib/icons";
import {
  chipLabel,
  forwardMailto,
  issueHeaderLine,
  sectionAnchor,
  sectionSponsorKicker,
  sectionSponsorOpenLabel,
  whyItPaysLabel,
} from "@/lib/issue-present";
import {
  issueSections,
  productivitySectionTopic,
  rampHandle,
  sortedGlossary,
  type Issue,
  type IssueSectionView,
  type IssueTool,
  type Ramp,
  type RoboticsItem,
  type SponsorCreative,
} from "@/lib/schema";
import { getSegment } from "@/lib/segments";
import { customizeLinkLabel, customizePitch, customizeWebPath, editor, signupBlockHeading, site, visitToolboxLabel } from "@/lib/site";
import { toolboxPathFor } from "@/lib/toolbox";

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
      <p className="meta">{tool.pricing}</p>
      {tool.sourceUrl ? (
        <p className="meta">
          Source: <a href={publicHref(tool.sourceUrl)}>{tool.sourceUrl}</a>
        </p>
      ) : null}
    </article>
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
        <span className="section-title">{topic}</span>
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

function RampView({ ramp }: { ramp: Ramp }) {
  return (
    <section className="ramp">
      <h2 className="ramp-heading">
        <SectionIcon topic="The Ramp" size={24} />
        <span>The Ramp</span>
      </h2>
      {ramp.intro ? <p className="ramp-intro">{ramp.intro}</p> : null}
      {ramp.posts.map((post) => (
        <article className="ramp-card" key={post.url}>
          <p className="ramp-byline">
            <span>{rampHandle(post.handle)}</span>
            {post.note ? <> {post.note}</> : null}
          </p>
          <blockquote className="ramp-quote">{post.text}</blockquote>
          <p className="meta">
            {post.author} <span className="meta">{formatIsoDay(post.postedAt)}</span>
          </p>
          <p className="ramp-link">
            <a href={publicHref(post.url)}>View on X</a>
          </p>
        </article>
      ))}
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

function ForwardLink({ issue }: { issue: Issue }) {
  return (
    <p className="issue-share">
      <a href={forwardMailto(issue)}>Forward this</a>
    </p>
  );
}

export function IssueBody({ issue }: { issue: Issue }) {
  const segment = getSegment(issue.segment);
  const sectionName = segment?.name ?? issue.segment;
  const sections = issueSections(issue);
  const ratesUrl = sectionSponsorRatesUrl(issue);
  const mailto = forwardMailto(issue);
  const toolboxPath = toolboxPathFor(issue.segment);
  return (
    <article className="dashboard">
      <header className="issue-masthead">
        <div className="wrap dashboard-wrap">
          <h1 className="issue-title">{issue.subject}</h1>
          <p className="issue-dateline">{issueHeaderLine(issue)}</p>
          <p className="issue-customize">
            {customizePitch} <a href={customizeWebPath}>{customizeLinkLabel}</a>
          </p>
          <p className="issue-share">
            <a href={mailto}>Forward this</a>
            {toolboxPath ? (
              <>
                {" · "}
                <a href={toolboxPath}>{visitToolboxLabel}</a>
              </>
            ) : null}
          </p>
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
            const productivity = topic === productivitySectionTopic;
            const number = String(index + 1).padStart(2, "0");
            return (
              <a
                key={topic}
                className={productivity ? "jump-chip productivity" : "jump-chip"}
                href={`#${sectionAnchor(topic)}`}
              >
                <b>{number}</b> {chipLabel(topic)}
              </a>
            );
          })}
        </nav>
        <SlotView name="primary" creative={issue.sponsors.primary} />
        <div className="dash-hero">
          <section className="top-story">
            <p className="top-kicker">
              <SectionIcon topic={issue.lead.kicker} size={28} />
              <span>{issue.lead.kicker}</span>
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
          <div className="dash-side">
            <WhatWeDo />
            <aside className="side-card dashboard-signup">
              <SignupForm
                defaultSegment={issue.segment}
                showSegment={false}
                heading={signupBlockHeading}
                submitLabel="Update My Preferences"
                pendingLabel="Saving"
              />
              <p className="meta" style={{ marginTop: "1rem" }}>
                <Link href={`/${issue.segment}/issues`}>All {sectionName} issues</Link>
              </p>
            </aside>
          </div>
        </div>
        {sections.map((section, index) => (
          <ToolSection key={section.topic ?? `tools-${index}`} section={section} index={index} ratesUrl={ratesUrl} />
        ))}
        <SlotView name="secondary" creative={issue.sponsors.secondary} />
        <div className="dash-split">
          <section className="dash-card">
            <div className="headed">
              <SectionIcon topic="Playbook" size={24} />
              <h2>{issue.playbook.title}</h2>
            </div>
            <p>{issue.playbook.intro}</p>
            <ol className="steps">
              {issue.playbook.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </section>
          <section className="dash-card">
            <div className="headed">
              <SectionIcon topic="Quick links" size={24} />
              <h2>Quick links</h2>
            </div>
            <ul className="link-list">
              {issue.quickLinks.map((link) => (
                <li key={link.url}>
                  <a href={publicHref(link.url)}>{link.title}</a>
                  <span className="meta"> {link.note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
        <SlotView name="classified" creative={issue.sponsors.classified} />
        {issue.ramp ? <RampView ramp={issue.ramp} /> : null}
        <GlossaryView issue={issue} />
        <ForwardLink issue={issue} />
        <p className="meta">
          <Link href={editor.path}>{editor.name}</Link>, {editor.jobTitle}
          {" · "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </div>
    </article>
  );
}
