import { sectionIconUrl } from "@/lib/icons";
import {
  issueSections,
  productivitySectionTopic,
  rampHandle,
  sortedGlossary,
  type Issue,
  type IssueSectionView,
  type Ramp,
  type RoboticsItem,
  type SponsorCreative,
} from "@/lib/schema";
import { unsubscribePath } from "@/lib/segment-memory";
import { absoluteUrl, sectionWordmark, site, whatWeDo } from "@/lib/site";
import { escapeHtml, publicHref } from "@/lib/html";
import { getSegment, segmentDisplayName } from "@/lib/segments";
import { formatIsoDay, issueDateline } from "@/lib/dates";

export type SlotName = "primary" | "secondary" | "classified";

/** Replaced per reader when a group shares one rendered issue. */
export const PREFERENCES_URL_MARKER = "{{preferences_url}}";
export const UNSUBSCRIBE_URL_MARKER = "{{unsubscribe_url}}";

export function applyReaderLinks(
  body: string,
  links: { preferencesUrl: string; unsubscribeUrl: string },
): string {
  return body
    .replaceAll(PREFERENCES_URL_MARKER, links.preferencesUrl)
    .replaceAll(UNSUBSCRIBE_URL_MARKER, links.unsubscribeUrl);
}

export type ResolvedSlot = {
  name: SlotName;
  label: string;
  house: boolean;
  creative: SponsorCreative;
};

const houseCopy: Record<SlotName, { copy: string; cta: string }> = {
  primary: {
    copy: "This primary slot is open. It sits at the top of each weekday issue: a logo, about 100 words, and two links. The listing stays in the archive.",
    cta: "View the rate card",
  },
  secondary: {
    copy: "This mid-issue slot is open. About 50 words and one link.",
    cta: "View the rate card",
  },
  classified: {
    copy: "This quick-link slot is open at the bottom of the issue. About 25 words and one link.",
    cta: "View the rate card",
  },
};

export function resolveSlot(name: SlotName, creative: SponsorCreative | null): ResolvedSlot {
  if (creative) {
    const house = Boolean(creative.house);
    return {
      name,
      label: house ? `${slotLabel(name)} - open` : slotLabel(name),
      house,
      creative,
    };
  }
  const house = houseCopy[name];
  return {
    name,
    label: `${slotLabel(name)} - open`,
    house: true,
    creative: {
      name: "Vizonix",
      url: "/sponsor",
      copy: house.copy,
      cta: house.cta,
      ctaUrl: "/sponsor",
      sample: false,
    },
  };
}

function slotLabel(name: SlotName): string {
  if (name === "primary") return "Primary sponsor";
  if (name === "secondary") return "Secondary sponsor";
  return "Classified";
}

function href(value: string, absolute: boolean): string {
  const safe = publicHref(value);
  return absolute ? (safe.startsWith("/") ? absoluteUrl(safe) : safe) : safe;
}

function emailIconCell(topic: string, alt: string, size: number): string {
  const icon = sectionIconUrl(topic, "email");
  if (!icon) return "";
  return `<td valign="middle" style="padding:0 18px 0 0;"><img src="${escapeHtml(icon)}" alt="${escapeHtml(alt)}" width="${size}" height="${size}" style="display:block;border:0;width:${size}px;height:${size}px;" /></td>`;
}

function emailIconHeading(iconKey: string, visible: string, headingStyle: string, iconPx: number): string {
  const icon = emailIconCell(iconKey, iconKey, iconPx);
  const heading = `<h2 style="${headingStyle}">${escapeHtml(visible)}</h2>`;
  if (!icon) return heading;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px;"><tr>${icon}<td valign="middle">${heading}</td></tr></table>`;
}

function sectionEmailHeading(heading: string, index: number, size = 30): string {
  const number = String(index + 1).padStart(2, "0");
  const iconCell = emailIconCell(heading, heading, size >= 36 ? 40 : 34);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 22px;border-top:2px solid #1c1915;">
              <tr>
                <td style="padding:16px 0 0;">
                  <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                    <tr>
                      ${iconCell}
                      <td valign="baseline" style="padding:0 18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:${size}px;font-weight:600;font-style:normal;letter-spacing:0.08em;line-height:1.15;color:#14532D;">${escapeHtml(number)}</td>
                      <td valign="baseline" style="padding:0;font-family:Georgia,'Times New Roman',serif;font-size:${size}px;font-style:italic;font-weight:normal;line-height:1.15;color:#1c1915;">${escapeHtml(heading)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`;
}

function sectionEmailHtml(section: IssueSectionView, payoff: string, absolute: boolean, index: number): string {
  const heading = section.topic ?? "Tool Highlights";
  const note = section.coverageNote
    ? `<p style="margin:8px 0 0;padding:10px 12px;background:#f7efe2;border:1px solid #e0cfae;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${escapeHtml(section.coverageNote)}</p>`
    : "";
  const intro = section.intro
    ? `<p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(section.intro)}${
        section.introSourceUrl
          ? ` Source: <a href="${escapeHtml(href(section.introSourceUrl, absolute))}" style="color:#1e4636;">${escapeHtml(section.introSourceUrl)}</a>`
          : ""
      }</p>`
    : "";
  const tools = toolEmailRows(section, payoff, absolute, heading === productivitySectionTopic ? "4px 24px 18px" : "8px 28px 16px");
  const robotics = roboticsEmailHtml(section.robotics, payoff, absolute);
  if (heading === productivitySectionTopic) {
    return `
          <tr>
            <td style="padding:48px 28px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #14532D;background:#f6f4ee;">
                <tr>
                  <td style="padding:28px 24px 8px;font-family:Georgia,serif;color:#1c1915;">
                    ${sectionEmailHeading(heading, index, 36)}
                    ${note}
                    ${intro}
                  </td>
                </tr>
                ${tools}
                ${robotics}
              </table>
            </td>
          </tr>`;
  }
  return `
          <tr>
            <td style="padding:48px 28px 0;font-family:Georgia,serif;color:#1c1915;">
              ${sectionEmailHeading(heading, index)}
              ${note}
              ${intro}
            </td>
          </tr>
          ${tools}
          ${robotics}`;
}

function roboticsEmailHtml(item: RoboticsItem | undefined, payoff: string, absolute: boolean): string {
  if (!item) return "";
  return `
      <tr>
        <td style="padding:4px 28px 8px;font-family:Georgia,serif;color:#1c1915;">
          <p style="margin:18px 0 8px;padding:14px 0 0;border-top:1px solid #d5cdc0;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:0.12em;text-transform:uppercase;color:#14532D;">Robotics</p>
          <p style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.2;color:#1c1915;">${escapeHtml(item.headline)}</p>
          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(item.summary)}</p>
          <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#3d3832;"><strong>${escapeHtml(payoff)}.</strong> ${escapeHtml(item.whyItMatters)}</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">Source: <a href="${escapeHtml(href(item.sourceUrl, absolute))}" style="color:#1e4636;">${escapeHtml(item.sourceName)}</a></p>
        </td>
      </tr>`;
}

function toolEmailRows(section: IssueSectionView, payoff: string, absolute: boolean, cellPadding: string): string {
  return section.tools
    .map((tool) => {
      const company = tool.company
        ? `<p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">${escapeHtml(tool.company)}</p>`
        : "";
      const source = tool.sourceUrl
        ? `<p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">Source: <a href="${escapeHtml(href(tool.sourceUrl, absolute))}" style="color:#1e4636;">${escapeHtml(tool.sourceUrl)}</a></p>`
        : "";
      return `
      <tr>
        <td style="padding:${cellPadding};font-family:Georgia,serif;color:#1c1915;">
          <p style="margin:0 0 4px;font-size:18px;"><a href="${escapeHtml(href(tool.url, absolute))}" style="color:#13233b;text-decoration:none;">${escapeHtml(tool.name)}</a></p>
          ${company}
          <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(tool.summary)}</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#3d3832;"><strong>${escapeHtml(payoff)}.</strong> ${escapeHtml(tool.whyItMatters)}</p>
          <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">${escapeHtml(tool.pricing)}</p>
          ${source}
        </td>
      </tr>`;
    })
    .join("");
}

function rampEmailHtml(ramp: Ramp | undefined): string {
  if (!ramp) return "";
  const intro = ramp.intro
    ? `<p style="margin:0 0 16px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(ramp.intro)}</p>`
    : "";
  const cards = ramp.posts
    .map((post) => {
      const note = post.note
        ? `<p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.45;color:#5f584e;">${escapeHtml(post.note)}</p>`
        : "";
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 14px;border:1px solid #d5cdc0;background:#fbfaf6;">
              <tr>
                <td style="padding:20px 22px;">
                  <p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-style:italic;line-height:1.45;color:#1c1915;">${escapeHtml(post.text).replaceAll("\n", "<br>")}</p>
                  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.4;color:#5f584e;">${escapeHtml(post.author)} - ${escapeHtml(rampHandle(post.handle))} - ${escapeHtml(formatIsoDay(post.postedAt))}</p>
                  ${note}
                  <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;"><a href="${escapeHtml(href(post.url, true))}" style="color:#1e4636;">View on X</a></p>
                </td>
              </tr>
            </table>`;
    })
    .join("");
  return `
          <tr>
            <td style="padding:48px 28px 0;font-family:Georgia,serif;color:#1c1915;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 12px;border-top:2px solid #1c1915;">
                <tr>
                  <td style="padding:16px 0 0;">
                    <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr>
                        ${emailIconCell("The Ramp", "The Ramp", 34)}
                        <td valign="middle" style="padding:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-style:italic;font-weight:normal;line-height:1.15;color:#1c1915;">The Ramp</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              ${intro}
              ${cards}
            </td>
          </tr>`;
}

function rampEmailText(ramp: Ramp | undefined): string[] {
  if (!ramp) return [];
  const lines = ["THE RAMP"];
  if (ramp.intro) lines.push(ramp.intro);
  lines.push("");
  for (const post of ramp.posts) {
    lines.push(post.text, `${post.author} - ${rampHandle(post.handle)} - ${formatIsoDay(post.postedAt)}`);
    if (post.note) lines.push(post.note);
    lines.push(`View on X: ${href(post.url, true)}`, "");
  }
  return lines;
}

function glossaryEmailHtml(issue: Issue): string {
  const entries = sortedGlossary(issue.glossary);
  if (entries.length === 0) return "";
  const rows = entries
    .map(
      (entry) =>
        `<p style="margin:16px 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-style:italic;font-weight:bold;line-height:1.2;color:#1c1915;">${escapeHtml(entry.term)}</p><p style="margin:0;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1c1915;">${escapeHtml(entry.definition)}</p>`,
    )
    .join("");
  return `
          <tr>
            <td style="padding:28px 28px 8px;font-family:Georgia,serif;color:#1c1915;">
              <h2 style="margin:0 0 4px;padding:16px 0 0;border-top:2px solid #1c1915;font-family:Georgia,'Times New Roman',serif;font-size:30px;font-style:italic;font-weight:normal;line-height:1.15;">AI Glossary</h2>
              ${rows}
            </td>
          </tr>`;
}

function glossaryEmailText(issue: Issue): string[] {
  const entries = sortedGlossary(issue.glossary);
  if (entries.length === 0) return [];
  const lines = ["AI GLOSSARY", ""];
  for (const entry of entries) lines.push(entry.term, entry.definition, "");
  return lines;
}

function sectionEmailText(section: IssueSectionView, payoff: string): string[] {
  const lines = [section.topic ? section.topic.toUpperCase() : "TOOL HIGHLIGHTS"];
  if (section.coverageNote) lines.push(section.coverageNote);
  if (section.intro) {
    lines.push(section.intro);
    if (section.introSourceUrl) lines.push(`Source: ${href(section.introSourceUrl, true)}`);
  }
  lines.push("");
  for (const tool of section.tools) {
    lines.push(tool.name);
    if (tool.company) lines.push(tool.company);
    lines.push(tool.summary, `${payoff}. ${tool.whyItMatters}`, tool.pricing, href(tool.url, true));
    if (tool.sourceUrl) lines.push(`Source: ${href(tool.sourceUrl, true)}`);
    lines.push("");
  }
  if (section.robotics) {
    const item = section.robotics;
    lines.push(
      "ROBOTICS",
      item.headline,
      item.summary,
      `${payoff}. ${item.whyItMatters}`,
      `Source: ${item.sourceName} (${href(item.sourceUrl, true)})`,
      "",
    );
  }
  return lines;
}

function slotHtml(slot: ResolvedSlot, absolute: boolean): string {
  const creative = slot.creative;
  const sample = creative.sample ? "Sample sponsor. Not a paid placement." : "";
  const second =
    creative.ctaSecondary && creative.ctaSecondaryUrl
      ? `<a href="${escapeHtml(href(creative.ctaSecondaryUrl, absolute))}" style="color:#1e4636;margin-left:16px;">${escapeHtml(creative.ctaSecondary)}</a>`
      : "";
  return `
    <tr>
      <td style="padding:16px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid ${slot.house ? "#d8d0c4" : "#8d6b3a"};background:${slot.house ? "#fbfaf6" : "#f3ead8"};">
          <tr>
            <td style="padding:16px 18px;font-family:Georgia,serif;color:#1c1915;">
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#8d6b3a;">${escapeHtml(slot.label)}</p>
              <p style="margin:0 0 8px;font-size:18px;"><a href="${escapeHtml(href(creative.url, absolute))}" style="color:#13233b;text-decoration:none;">${escapeHtml(creative.name)}</a></p>
              <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(creative.copy)}</p>
              ${sample ? `<p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">${escapeHtml(sample)}</p>` : ""}
              <p style="margin:0;font-family:Arial,sans-serif;font-size:15px;">
                <a href="${escapeHtml(href(creative.ctaUrl, absolute))}" style="color:#1e4636;font-weight:bold;">${escapeHtml(creative.cta)}</a>
                ${second}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

export type IssueRenderOptions = {
  mode: "broadcast" | "test" | "personal";
  /** HTML inserted under the masthead. Caller must escape any untrusted text. */
  introHtml?: string;
  /** Plain-text block inserted under the masthead. */
  introText?: string;
  preheader?: string;
  /** Overrides the footer unsubscribe link. Broadcast issues keep the Resend placeholder. */
  unsubscribeUrl?: string;
  /** Signed manage link. Personal sends substitute PREFERENCES_URL_MARKER per reader. */
  preferencesUrl?: string;
  /** Section topics to leave out. Top story, The Ramp, and sponsor slots stay. */
  excludedSections?: string[];
};

function sectionsForRender(issue: Issue, excluded: string[] | undefined): IssueSectionView[] {
  const skip = new Set((excluded ?? []).map((topic) => topic.trim().toLowerCase()));
  return issueSections(issue).filter((section) => !skip.has((section.topic ?? "").trim().toLowerCase()));
}

function issueUnsubscribe(segmentSlug: string, options: IssueRenderOptions): string {
  if (options.unsubscribeUrl) return options.unsubscribeUrl;
  if (options.mode === "broadcast") return "{{{RESEND_UNSUBSCRIBE_URL}}}";
  if (options.mode === "personal") return UNSUBSCRIBE_URL_MARKER;
  return absoluteUrl(unsubscribePath(segmentSlug));
}

function preferencesHref(options: IssueRenderOptions): string {
  return options.preferencesUrl || PREFERENCES_URL_MARKER;
}

export function listUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  return {
    "List-Unsubscribe": `<${unsubscribeUrl}>`,
  };
}

/** Cream band above the navy bar. A spacer row holds in Gmail and Outlook, which drop body margin. */
function emailMastheadGap(): string {
  return `<tr>
      <td height="32" style="height:32px;line-height:32px;font-size:1px;mso-line-height-rule:exactly;background:#f4f1ea;">&nbsp;</td>
    </tr>`;
}

function emailMasthead(sectionName: string): string {
  return `<tr>
            <td style="background:#13233b;padding:22px 28px;">
              <p style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:23px;letter-spacing:0.01em;line-height:1.15;color:#f6f3ec;">${escapeHtml(sectionWordmark(sectionName))}</p>
            </td>
          </tr>`;
}

function issueHeaderHtml(title: string, dateline: string): string {
  return `<tr>
            <td style="padding:28px 28px 0;font-family:Georgia,'Times New Roman',serif;color:#1c1915;">
              <h1 style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.15;font-weight:normal;color:#1c1915;">${escapeHtml(title)}</h1>
              <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;letter-spacing:0.04em;color:#14532D;">${escapeHtml(dateline)}</p>
              <h2 style="margin:0 0 8px;padding:16px 0 0;border-top:2px solid #14532D;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-style:italic;font-weight:normal;line-height:1.15;color:#14532D;">${escapeHtml(whatWeDo.heading)}</h2>
              <p style="margin:0 0 28px;font-family:Arial,sans-serif;font-size:16px;line-height:1.55;color:#1c1915;">${escapeHtml(whatWeDo.copy)}</p>
            </td>
          </tr>`;
}

export function renderIssueEmail(issue: Issue, options: IssueRenderOptions): string {
  const segment = getSegment(issue.segment);
  const sectionName = segment?.name ?? issue.segment;
  const editionName = segment ? segmentDisplayName(segment) : issue.segment;
  const payoff = segment?.payoffLabel ?? "Why it matters";
  const absolute = true;
  const archive = absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
  const unsubscribe = issueUnsubscribe(issue.segment, options);
  const preview = options.preheader ?? issue.preheader;
  const intro = options.introHtml
    ? `<tr><td style="padding:16px 28px 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1c1915;">${options.introHtml}</td></tr>`
    : "";
  const primary = resolveSlot("primary", issue.sponsors.primary);
  const secondary = resolveSlot("secondary", issue.sponsors.secondary);
  const classified = resolveSlot("classified", issue.sponsors.classified);

  const tools = sectionsForRender(issue, options.excludedSections)
    .map((section, index) => sectionEmailHtml(section, payoff, absolute, index))
    .join("");

  const steps = issue.playbook.steps
    .map((step) => `<li style="margin:0 0 6px;">${escapeHtml(step)}</li>`)
    .join("");

  const links = issue.quickLinks
    .map(
      (link) =>
        `<li style="margin:0 0 6px;"><a href="${escapeHtml(href(link.url, absolute))}" style="color:#1e4636;">${escapeHtml(link.title)}</a> <span style="color:#5f584e;">${escapeHtml(link.note)}</span></li>`,
    )
    .join("");

  const sample = issue.sample
    ? `<tr><td style="padding:16px 28px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#1c1915;"><p style="margin:0;padding:12px 14px;background:#f7efe2;border:1px solid #8d6b3a;">Sample issue. The tools and sponsor in this edition are fictional placeholders. They are not endorsements and not paid placements.</p></td></tr>`
    : "";
  const directory = absoluteUrl(`/${issue.segment}/tools`);
  const linkRow = `<tr>
            <td style="padding:12px 28px 0;">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="font-family:Arial,sans-serif;font-size:13px;line-height:1.4;">
                    <a href="${escapeHtml(directory)}" style="color:#1e4636;text-decoration:underline;">Tool Directory</a>
                  </td>
                  <td style="font-family:Arial,sans-serif;font-size:13px;line-height:1.4;color:#8a8175;padding:0 8px;">|</td>
                  <td style="font-family:Arial,sans-serif;font-size:13px;line-height:1.4;">
                    <a href="${escapeHtml(archive)}" style="color:#1e4636;text-decoration:underline;">Read on the web</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(issue.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f1ea;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;">
    ${emailMastheadGap()}
    <tr>
      <td align="center" style="background:#f4f1ea;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fbfaf6;">
          ${emailMasthead(editionName)}
          ${issueHeaderHtml(issue.subject, issueDateline(sectionName, issue))}
          ${linkRow}
          ${intro}
          ${sample}
          ${slotHtml(primary, absolute)}
          <tr>
            <td style="padding:8px 28px 0;font-family:Georgia,serif;color:#1c1915;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5f584e;">${escapeHtml(issue.lead.kicker)}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0;">
                <tr>
                  ${emailIconCell(issue.lead.kicker, issue.lead.kicker, 34)}
                  <td valign="middle"><h2 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.2;font-weight:normal;color:#1c1915;">${escapeHtml(issue.lead.title)}</h2></td>
                </tr>
              </table>
              <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:16px;line-height:1.55;">${escapeHtml(issue.lead.summary)}</p>
              <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;"><strong>${escapeHtml(payoff)}.</strong> ${escapeHtml(issue.lead.whyItMatters)}</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">Source: <a href="${escapeHtml(href(issue.lead.sourceUrl, absolute))}" style="color:#1e4636;">${escapeHtml(issue.lead.sourceName)}</a></p>
              ${
                issue.lead.productUrl
                  ? `<p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">Product: <a href="${escapeHtml(href(issue.lead.productUrl, absolute))}" style="color:#1e4636;">${escapeHtml(issue.lead.productUrl)}</a></p>`
                  : ""
              }
            </td>
          </tr>
          ${rampEmailHtml(issue.ramp)}
          ${tools}
          ${slotHtml(secondary, absolute)}
          <tr>
            <td style="padding:8px 28px 16px;font-family:Georgia,serif;color:#1c1915;">
              ${emailIconHeading("Playbook", issue.playbook.title, "margin:0;font-size:22px;font-weight:normal;", 26)}
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(issue.playbook.intro)}</p>
              <ol style="margin:0;padding-left:18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${steps}</ol>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px;font-family:Georgia,serif;color:#1c1915;">
              ${emailIconHeading("Quick links", "Quick links", "margin:0;font-size:22px;font-weight:normal;", 26)}
              <ul style="margin:0;padding-left:18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${links}</ul>
            </td>
          </tr>
          ${slotHtml(classified, absolute)}
          ${glossaryEmailHtml(issue)}
          <tr>
            <td style="padding:8px 28px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5f584e;">
              <p style="margin:0 0 8px;"><a href="${escapeHtml(archive)}" style="color:#1e4636;">Read this issue on the web</a></p>
              <p style="margin:0 0 8px;">You are receiving this because you confirmed a subscription to the Vizonix ${escapeHtml(editionName)} briefing. A mention is not an endorsement. Sponsored slots are labeled.</p>
              <p style="margin:0 0 8px;"><a href="${escapeHtml(preferencesHref(options))}" style="color:#1e4636;">Manage your topics</a></p>
              <p style="margin:0;"><a href="${escapeHtml(unsubscribe)}" style="color:#1e4636;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderIssueText(issue: Issue, options: IssueRenderOptions): string {
  const segment = getSegment(issue.segment);
  const sectionName = segment?.name ?? issue.segment;
  const editionName = segment ? segmentDisplayName(segment) : issue.segment;
  const payoff = segment?.payoffLabel ?? "Why it matters";
  const archive = absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
  const directory = absoluteUrl(`/${issue.segment}/tools`);
  const unsubscribe = issueUnsubscribe(issue.segment, options);

  function slotLines(label: string, creative: SponsorCreative | null, name: SlotName): string[] {
    const resolved = resolveSlot(name, creative);
    const url = href(resolved.creative.ctaUrl, true);
    return [label, resolved.creative.name, resolved.creative.copy, `${resolved.creative.cta}: ${url}`, ""];
  }

  const lines = [
    sectionWordmark(editionName),
    issue.subject,
    issueDateline(sectionName, issue),
    "",
    whatWeDo.heading.toUpperCase(),
    whatWeDo.copy,
    "",
    `Tool Directory: ${directory}`,
    `Read on the web: ${archive}`,
    "",
    ...(options.introText ? [options.introText, ""] : []),
    ...(issue.sample
      ? ["Sample issue. The tools and sponsor in this edition are fictional placeholders.", ""]
      : []),
    ...slotLines("PRIMARY SPONSOR", issue.sponsors.primary, "primary"),
    issue.lead.kicker.toUpperCase(),
    issue.lead.title,
    issue.lead.summary,
    `${payoff}. ${issue.lead.whyItMatters}`,
    `Source: ${issue.lead.sourceName} (${href(issue.lead.sourceUrl, true)})`,
    ...(issue.lead.productUrl ? [`Product: ${href(issue.lead.productUrl, true)}`] : []),
    "",
    ...rampEmailText(issue.ramp),
    ...sectionsForRender(issue, options.excludedSections).flatMap((section) => sectionEmailText(section, payoff)),
    ...slotLines("SECONDARY SPONSOR", issue.sponsors.secondary, "secondary"),
    issue.playbook.title.toUpperCase(),
    issue.playbook.intro,
    ...issue.playbook.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "QUICK LINKS",
    ...issue.quickLinks.map((link) => `${link.title}: ${href(link.url, true)} (${link.note})`),
    "",
    ...slotLines("CLASSIFIED", issue.sponsors.classified, "classified"),
    ...glossaryEmailText(issue),
    `Read this issue on the web: ${archive}`,
    `Manage your topics: ${preferencesHref(options)}`,
    `Unsubscribe: ${unsubscribe}`,
  ];
  return `${lines.join("\n")}\n`;
}

const welcomeParagraphStyle =
  "margin:0 0 10px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1c1915;";

export function welcomeParagraphs(sectionName: string, issueUrl?: string): string[] {
  return [
    `Thanks for confirming. You are on the Vizonix ${sectionName} list.`,
    `Expect a short AI briefing every weekday morning for ${sectionName}.`,
    `Add ${site.email} to your contacts, or reply to this email to say hi. That helps the briefing reach your inbox.`,
    issueUrl
      ? `Read this issue on the web: ${issueUrl}`
      : "No issue is in the archive yet. You will get the first one on a weekday morning.",
  ];
}

function welcomeIntroHtml(sectionName: string, issueUrl?: string): string {
  const paragraphs = welcomeParagraphs(sectionName, issueUrl);
  return paragraphs
    .map((paragraph, index) => {
      if (issueUrl && index === paragraphs.length - 1) {
        return `<p style="${welcomeParagraphStyle}">Read this issue on the web: <a href="${escapeHtml(issueUrl)}" style="color:#1e4636;">${escapeHtml(issueUrl)}</a></p>`;
      }
      return `<p style="${welcomeParagraphStyle}">${escapeHtml(paragraph)}</p>`;
    })
    .join("");
}

export type WelcomeMessage = {
  subject: string;
  html: string;
  text: string;
  headers: Record<string, string>;
};

/** Daily-issue layout with a short welcome above it. */
export function welcomeIssueMessage(
  issue: Issue,
  unsubscribeUrl: string,
  preferencesUrl?: string,
): WelcomeMessage {
  const sectionName = getSegment(issue.segment)?.name ?? issue.segment;
  const issueUrl = absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
  const paragraphs = welcomeParagraphs(sectionName, issueUrl);
  return {
    subject: `Welcome to Vizonix - here's the latest ${sectionName} issue`,
    html: renderIssueEmail(issue, {
      mode: "test",
      introHtml: welcomeIntroHtml(sectionName, issueUrl),
      preheader: paragraphs[0],
      unsubscribeUrl,
      preferencesUrl,
    }),
    text: renderIssueText(issue, {
      mode: "test",
      introText: paragraphs.join("\n\n"),
      unsubscribeUrl,
      preferencesUrl,
    }),
    headers: listUnsubscribeHeaders(unsubscribeUrl),
  };
}

/** Used when the segment has no non-sample issue yet. */
export function welcomePlainMessage(
  sectionName: string,
  sectionUrl: string,
  unsubscribeUrl: string,
  preferencesUrl?: string,
): WelcomeMessage {
  const paragraphs = welcomeParagraphs(sectionName);
  const manageUrl = preferencesUrl || PREFERENCES_URL_MARKER;
  const text = [
    ...paragraphs,
    `Section: ${sectionUrl}`,
    `Manage your topics: ${manageUrl}`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Welcome to Vizonix</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f1ea;">${escapeHtml(paragraphs[0] ?? "")}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;">
    ${emailMastheadGap()}
    <tr>
      <td align="center" style="background:#f4f1ea;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fbfaf6;">
          ${emailMasthead(sectionName)}
          <tr>
            <td style="padding:22px 28px 8px;">${welcomeIntroHtml(sectionName)}</td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1c1915;">
              <p style="margin:0 0 12px;"><a href="${escapeHtml(sectionUrl)}" style="color:#1e4636;">Visit the ${escapeHtml(sectionName)} section</a></p>
              <p style="margin:0 0 8px;font-size:13px;color:#5f584e;"><a href="${escapeHtml(manageUrl)}" style="color:#1e4636;">Manage your topics</a></p>
              <p style="margin:0;font-size:13px;color:#5f584e;"><a href="${escapeHtml(unsubscribeUrl)}" style="color:#1e4636;">Unsubscribe</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return {
    subject: `Welcome to Vizonix - ${sectionName}`,
    html,
    text: `${text}\n`,
    headers: listUnsubscribeHeaders(unsubscribeUrl),
  };
}

export function confirmationEmail(input: {
  sectionName: string;
  confirmUrl: string;
  preferencesUrl?: string;
}): { html: string; text: string; subject: string } {
  const manageUrl = input.preferencesUrl || PREFERENCES_URL_MARKER;
  const subject = `Confirm your Vizonix ${input.sectionName} briefing`;
  const text = [
    `Confirm your Vizonix ${input.sectionName} briefing.`,
    "",
    "You are not subscribed until you open this link and confirm:",
    input.confirmUrl,
    "",
    "If you did not ask for this, ignore the email. The address will stay off the list.",
    "",
    `Manage your topics: ${manageUrl}`,
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f1ea;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:560px;max-width:100%;background:#fbfaf6;">
          <tr><td style="background:#13233b;color:#f4f1ea;padding:20px 24px;font-family:Georgia,serif;">Vizonix</td></tr>
          <tr>
            <td style="padding:24px;font-family:Arial,sans-serif;color:#1c1915;font-size:16px;line-height:1.5;">
              <p style="margin:0 0 12px;">Confirm your Vizonix ${escapeHtml(input.sectionName)} briefing.</p>
              <p style="margin:0 0 16px;">You are not subscribed until you confirm. The link is good for 48 hours.</p>
              <p style="margin:0 0 16px;"><a href="${escapeHtml(input.confirmUrl)}" style="background:#1e4636;color:#f7f4ee;padding:12px 16px;text-decoration:none;display:inline-block;">Confirm subscription</a></p>
              <p style="margin:0 0 12px;font-size:13px;color:#5f584e;">If you did not ask for this, ignore the email. The address will stay off the list.</p>
              <p style="margin:0;font-size:13px;"><a href="${escapeHtml(manageUrl)}" style="color:#1e4636;">Manage your topics</a></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  return { subject, html, text };
}

export function unsubscribeLinkEmail(input: {
  sectionName: string;
  unsubscribeUrl: string;
  preferencesUrl?: string;
}): { html: string; text: string; subject: string } {
  const manageUrl = input.preferencesUrl || PREFERENCES_URL_MARKER;
  const subject = `Unsubscribe from the Vizonix ${input.sectionName} briefing`;
  const text = [
    `Use this link to leave the Vizonix ${input.sectionName} briefing:`,
    input.unsubscribeUrl,
    "",
    "The link is good for 180 days. If you did not ask for it, you can ignore this email.",
    "",
    `Manage your topics: ${manageUrl}`,
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#1c1915;">
  <p style="margin:24px;">Use this link to leave the Vizonix ${escapeHtml(input.sectionName)} briefing:</p>
  <p style="margin:24px;"><a href="${escapeHtml(input.unsubscribeUrl)}">Unsubscribe</a></p>
  <p style="margin:24px;color:#5f584e;">If you did not ask for this, ignore the email.</p>
  <p style="margin:24px;"><a href="${escapeHtml(manageUrl)}">Manage your topics</a></p>
</body>
</html>`;
  return { subject, html, text };
}
