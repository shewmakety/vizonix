import { sectionIconUrl, toolboxIllustrationUrl } from "@/lib/icons";
import {
  productivitySectionTopic,
  sortedGlossary,
  type Issue,
  type IssueSectionView,
  type IssueTool,
  type RoboticsItem,
  type SponsorCreative,
} from "@/lib/schema";
import { unsubscribePath } from "@/lib/segment-memory";
import { signToken, tokenSecret } from "@/lib/tokens";
import {
  absoluteUrl,
  customizeCard,
  sectionWordmark,
  site,
  toolboxCard,
  toolboxCardCopy,
  toolboxCardIcon,
  whatWeDo,
  whatWeDoBody,
} from "@/lib/site";
import { formatNumericDate } from "@/lib/dates";
import { escapeHtml, publicHref } from "@/lib/html";
import {
  chipLabel,
  contactVendorParts,
  forwardMailto,
  forwardedSubscribeUrl,
  sectionAnchor,
  sectionHeadingLabel,
  sectionSponsorKicker,
  sectionSponsorOpenLabel,
  topStoryLabel,
  vendorWebsiteLabel,
  whyItPaysLabel,
} from "@/lib/issue-present";
import { sectionsForReader } from "@/lib/personalize";
import {
  getSegment,
  segmentDisplayName,
  segmentHeaderName,
  toolDirectoryLabel,
  toolDirectoryPath,
} from "@/lib/segments";
import { sponsorSlotSpec, type RenderedIssueSlotId } from "@/lib/sponsor-slots";
import { toolboxCardHref } from "@/lib/toolbox";

export type SlotName = RenderedIssueSlotId;

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

/** Rates link used by the primary sponsor block, so an open section points at the same page. */
export function sectionSponsorRatesUrl(issue: Pick<Issue, "sponsors">): string {
  return resolveSlot("primary", issue.sponsors.primary).creative.ctaUrl;
}

function slotLabel(name: SlotName): string {
  return sponsorSlotSpec(name)?.name ?? name;
}

function href(value: string, absolute: boolean): string {
  const safe = publicHref(value);
  return absolute ? (safe.startsWith("/") ? absoluteUrl(safe) : safe) : safe;
}

function emailIconCell(topic: string, alt: string, size: number, padRight = 18): string {
  const icon = sectionIconUrl(topic, "email");
  if (!icon) return "";
  return `<td valign="middle" style="padding:0 ${padRight}px 0 0;"><img src="${escapeHtml(icon)}" alt="${escapeHtml(alt)}" width="${size}" height="${size}" style="display:block;border:0;width:${size}px;height:${size}px;" /></td>`;
}

function whyPaysHtml(text: string): string {
  return `<div style="font-size:13px;line-height:1.5;color:#14532D;margin-top:8px;background:#eef5f0;padding:8px 10px;border-radius:5px;"><strong>${escapeHtml(whyItPaysLabel)}:</strong> ${escapeHtml(text)}</div>`;
}

function tagHtml(kind: "Robotics" | "AI tool"): string {
  const background = kind === "Robotics" ? "#13233b" : "#14532D";
  return `<span style="display:inline-block;font-size:10px;font-weight:700;letter-spacing:0.1em;color:#ffffff;background:${background};padding:3px 7px;border-radius:3px;text-transform:uppercase;">${kind}</span>`;
}

function tileEmailHtml(body: string): string {
  return `<tr>
        <td class="vz-stack" style="padding:6px 0;">
          <div style="background:#ffffff;border:1px solid #dfe3ea;border-radius:8px;padding:16px;font-family:Arial,Helvetica,sans-serif;">${body}</div>
        </td>
      </tr>`;
}

function sectionEmailHeading(topic: string, index: number, productivity: boolean): string {
  const number = String(index + 1).padStart(2, "0");
  const visible = sectionHeadingLabel(topic);
  const iconPx = productivity ? 36 : 28;
  const titleSize = productivity ? 30 : 22;
  const numberColor = productivity ? "#c9e6d0" : "#c9b98f";
  const titleColor = productivity ? "#ffffff" : "#13233b";
  const rule = productivity ? "#ffffff" : "#13233b";
  const icon = sectionIconUrl(topic, "email");
  const iconCell = icon
    ? `<td valign="middle" align="left" style="padding:0 8px 0 0;vertical-align:middle;line-height:0;font-size:0;"><img src="${escapeHtml(icon)}" alt="${escapeHtml(topic)}" width="${iconPx}" height="${iconPx}" style="display:block;border:0;width:${iconPx}px;height:${iconPx}px;" /></td>`
    : "";
  return `<table id="${escapeHtml(sectionAnchor(topic))}" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;margin:0 0 8px;">
              <tr>
                <td align="left" valign="middle" style="padding:0 0 6px;border-bottom:3px solid ${rule};">
                  <table role="presentation" align="left" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                    <tr>
                      <td valign="middle" align="left" style="padding:0 8px 0 0;vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:500;line-height:1;color:${numberColor};white-space:nowrap;">${escapeHtml(number)}</td>
                      ${iconCell}
                      <td valign="middle" align="left" style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;font-size:${titleSize}px;font-weight:800;line-height:1.15;color:${titleColor};">${escapeHtml(visible)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>`;
}

function sectionSponsorEmailHtml(
  section: IssueSectionView,
  absolute: boolean,
  ratesUrl: string,
  onDark: boolean,
): string {
  const shell =
    "margin:0 0 12px;padding:8px 10px;background:#f7f5f0;border:1px solid #e4dfd4;border-radius:6px;font-family:Arial,Helvetica,sans-serif;";
  const sponsor = section.sponsor;
  if (!sponsor) {
    const border = onDark ? "#d7e8dc" : "#e0d9cc";
    const color = onDark ? "#ffffff" : "#6b645b";
    return `<div style="${shell}background:transparent;border-style:dashed;border-color:${border};"><a href="${escapeHtml(href(ratesUrl, absolute))}" style="color:${color};font-size:12px;font-weight:700;letter-spacing:0.02em;text-decoration:none;">${escapeHtml(sectionSponsorOpenLabel)}</a></div>`;
  }
  const logo = sponsor.logo
    ? `<td valign="middle" style="padding:0 10px 0 0;"><img src="${escapeHtml(href(sponsor.logo, absolute))}" alt="" width="28" height="28" style="display:block;border:0;width:28px;height:28px;" /></td>`
    : "";
  return `<div style="${shell}">
            <p style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#8a8175;">${escapeHtml(sectionSponsorKicker)}</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
              <tr>
                ${logo}
                <td valign="middle">
                  <a href="${escapeHtml(href(sponsor.url, absolute))}" rel="sponsored" style="color:#13233b;font-size:14px;font-weight:700;text-decoration:none;">${escapeHtml(sponsor.name)}</a>
                  <div style="font-size:13px;line-height:1.4;color:#4a5262;">${escapeHtml(sponsor.line)}</div>
                </td>
              </tr>
            </table>
          </div>`;
}

function sectionEmailHtml(section: IssueSectionView, absolute: boolean, index: number, ratesUrl: string): string {
  const heading = section.topic ?? "Tool Highlights";
  const productivity = heading === productivitySectionTopic;
  const prose = productivity ? "#ffffff" : "#1c1915";
  const sponsor = sectionSponsorEmailHtml(section, absolute, ratesUrl, productivity);
  const note = section.coverageNote
    ? `<p style="margin:8px 0 0;padding:10px 12px;background:#f7efe2;border:1px solid #e0cfae;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#1c1915;">${escapeHtml(section.coverageNote)}</p>`
    : "";
  const intro = section.intro
    ? `<p style="margin:8px 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:${prose};">${escapeHtml(section.intro)}${
        section.introSourceUrl
          ? ` Source: <a href="${escapeHtml(href(section.introSourceUrl, absolute))}" style="color:${productivity ? "#c9e6d0" : "#1e4636"};">${escapeHtml(section.introSourceUrl)}</a>`
          : ""
      }</p>`
    : "";
  const tiles = `${roboticsEmailHtml(section.robotics, absolute)}${toolEmailRows(section, absolute)}`;
  const block = `${sectionEmailHeading(heading, index, productivity)}${sponsor}${note}${intro}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="vz-stack" style="border-collapse:collapse;">${tiles}</table>`;
  if (productivity) {
    return `
          <tr>
            <td style="padding:30px 20px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#14532D;border-radius:10px;">
                <tr>
                  <td style="padding:18px 18px 12px;">${block}</td>
                </tr>
              </table>
            </td>
          </tr>`;
  }
  return `
          <tr>
            <td style="padding:30px 20px 0;font-family:Arial,Helvetica,sans-serif;color:#1c1915;">${block}</td>
          </tr>`;
}

function roboticsEmailHtml(item: RoboticsItem | undefined, absolute: boolean): string {
  if (!item) return "";
  return tileEmailHtml(`
          ${tagHtml("Robotics")}
          <div style="font-size:17px;font-weight:700;line-height:1.3;color:#13233b;margin:10px 0 6px;">${escapeHtml(item.headline)}</div>
          <div style="font-size:14px;line-height:1.5;color:#4a5262;">${escapeHtml(item.summary)}</div>
          ${whyPaysHtml(item.whyItMatters)}
          <p style="margin:8px 0 0;font-size:13px;color:#5f584e;">Source: <a href="${escapeHtml(href(item.sourceUrl, absolute))}" style="color:#14532D;">${escapeHtml(item.sourceName)}</a></p>`);
}

function pricingEmailHtml(tool: IssueTool, absolute: boolean): string {
  const vendor = tool.vendorUrl ? href(tool.vendorUrl, absolute) : "";
  const parts = vendor ? contactVendorParts(tool.pricing) : null;
  if (!vendor || !parts) return escapeHtml(tool.pricing);
  const link = `<a href="${escapeHtml(vendor)}" style="color:#14532D;">${escapeHtml(parts.phrase)}</a>`;
  return `${escapeHtml(parts.before)}${link}${escapeHtml(parts.after)}`;
}

function vendorEmailHtml(tool: IssueTool, absolute: boolean): string {
  if (!tool.vendorUrl) return "";
  const vendor = href(tool.vendorUrl, absolute);
  return `<p style="margin:6px 0 0;font-size:13px;color:#5f584e;">Website: <a href="${escapeHtml(vendor)}" style="color:#14532D;">${escapeHtml(vendorWebsiteLabel(tool.vendorUrl))}</a></p>`;
}

function toolEmailRows(section: IssueSectionView, absolute: boolean): string {
  return section.tools
    .map((tool) => {
      const company = tool.company ? ` - ${escapeHtml(tool.company)}` : "";
      const source = tool.sourceUrl
        ? `<p style="margin:6px 0 0;font-size:13px;color:#5f584e;">Source: <a href="${escapeHtml(href(tool.sourceUrl, absolute))}" style="color:#14532D;">${escapeHtml(tool.sourceUrl)}</a></p>`
        : "";
      return tileEmailHtml(`
          ${tagHtml("AI tool")}
          <div style="font-size:17px;font-weight:700;line-height:1.3;color:#13233b;margin:10px 0 6px;"><a href="${escapeHtml(href(tool.url, absolute))}" style="color:#13233b;text-decoration:none;">${escapeHtml(tool.name)}</a>${company}</div>
          <div style="font-size:14px;line-height:1.5;color:#4a5262;">${escapeHtml(tool.summary)}</div>
          ${whyPaysHtml(tool.whyItMatters)}
          <p style="margin:8px 0 0;font-size:13px;color:#5f584e;">${pricingEmailHtml(tool, absolute)}</p>
          ${vendorEmailHtml(tool, absolute)}
          ${source}`);
    })
    .join("");
}

function navyCardEmailHtml(heading: string, bodyHtml: string): string {
  return `
          <tr>
            <td style="padding:14px 20px 0;">
              <div style="background:#13233b;color:#ffffff;border-radius:8px;padding:18px;">
                <h2 style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#c9b98f;">${escapeHtml(heading)}</h2>
                ${bodyHtml}
              </div>
            </td>
          </tr>`;
}

function preferencesButtonEmailHtml(preferencesUrl: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin-top:14px;"><tr><td bgcolor="#c9b98f" style="background-color:#c9b98f;border-radius:4px;"><a href="${escapeHtml(preferencesUrl)}" style="display:inline-block;padding:8px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;line-height:1.2;color:#13233b;text-decoration:none;">${escapeHtml(customizeCard.action)}</a></td></tr></table>`;
}

function whatWeDoEmailHtml(preferencesUrl: string): string {
  return navyCardEmailHtml(
    whatWeDo.heading,
    `<p style="margin:0;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#ffffff;">${escapeHtml(whatWeDoBody())}</p>${preferencesButtonEmailHtml(preferencesUrl)}`,
  );
}

function glossaryEmailHtml(issue: Issue): string {
  const entries = sortedGlossary(issue.glossary);
  if (entries.length === 0) return "";
  const rows = entries
    .map(
      (entry) =>
        `<tr><td valign="top" class="glossary-term" style="font-size:13px;font-weight:700;color:#13233b;padding:6px 10px 6px 0;width:30%;border-top:1px solid #eceff3;font-family:Arial,Helvetica,sans-serif;">${escapeHtml(entry.term)}</td><td class="glossary-definition" style="font-size:13px;color:#4a5262;padding:6px 0;border-top:1px solid #eceff3;font-family:Arial,Helvetica,sans-serif;line-height:1.45;">${escapeHtml(entry.definition)}</td></tr>`,
    )
    .join("");
  return `
          <tr>
            <td style="padding:16px 20px 8px;">
              <div style="background:#ffffff;border-radius:8px;padding:18px;">
                <h2 style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:700;line-height:1.2;color:#13233b;">AI Glossary</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${rows}</table>
              </div>
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

function sectionSponsorText(section: IssueSectionView, ratesUrl: string): string[] {
  const sponsor = section.sponsor;
  if (!sponsor) return [`${sectionSponsorOpenLabel}: ${href(ratesUrl, true)}`];
  return [sectionSponsorKicker.toUpperCase(), sponsor.name, sponsor.line, href(sponsor.url, true)];
}

function sectionEmailText(section: IssueSectionView, ratesUrl: string): string[] {
  const heading = sectionHeadingLabel(section.topic ?? "Tool Highlights").toUpperCase();
  const lines = [heading, ...sectionSponsorText(section, ratesUrl)];
  if (section.coverageNote) lines.push(section.coverageNote);
  if (section.intro) {
    lines.push(section.intro);
    if (section.introSourceUrl) lines.push(`Source: ${href(section.introSourceUrl, true)}`);
  }
  lines.push("");
  if (section.robotics) {
    const item = section.robotics;
    lines.push(
      "ROBOTICS",
      item.headline,
      item.summary,
      `${whyItPaysLabel}: ${item.whyItMatters}`,
      `Source: ${item.sourceName} (${href(item.sourceUrl, true)})`,
      "",
    );
  }
  for (const tool of section.tools) {
    lines.push(tool.name);
    if (tool.company) lines.push(tool.company);
    lines.push(tool.summary, `${whyItPaysLabel}: ${tool.whyItMatters}`, tool.pricing, href(tool.url, true));
    if (tool.vendorUrl) lines.push(`Website: ${href(tool.vendorUrl, true)}`);
    if (tool.sourceUrl) lines.push(`Source: ${href(tool.sourceUrl, true)}`);
    lines.push("");
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
              <p style="margin:0 0 8px;font-size:18px;">${
                creative.logo
                  ? `<img src="${escapeHtml(href(creative.logo, absolute))}" alt="" width="28" height="28" style="display:inline-block;vertical-align:middle;border:0;margin-right:8px;" />`
                  : ""
              }<a href="${escapeHtml(href(creative.url, absolute))}" style="color:#13233b;text-decoration:none;">${escapeHtml(creative.name)}</a></p>
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
  mode: "broadcast" | "test";
  /** HTML inserted under the masthead. Caller must escape any untrusted text. */
  introHtml?: string;
  /** Plain-text block inserted under the masthead. */
  introText?: string;
  preheader?: string;
  /** Overrides the footer unsubscribe link. Broadcast issues keep the Resend placeholder. */
  unsubscribeUrl?: string;
  /** Signed manage link. Defaults to the unsigned preferences page. */
  preferencesUrl?: string;
  /** Optional topic sections to omit. The top story and sponsor slots stay. */
  excludedSections?: readonly string[];
};

function issueDirectoryLink(segmentSlug: string): { href: string; label: string } {
  return { href: absoluteUrl(`/${segmentSlug}/tools`), label: "Tool Directory" };
}

function toolboxCardEmailHtml(segmentSlug: string): string {
  const path = toolboxCardHref(segmentSlug, "email");
  if (!path) return "";
  const img = toolboxIllustrationUrl("email");
  const { width, height } = toolboxCardIcon;
  return `<tr>
            <td style="padding:16px 20px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#ffffff;border:1px solid #dfe3ea;border-radius:8px;">
                <tr>
                  <td align="center" style="padding:18px 22px 22px;font-family:Arial,Helvetica,sans-serif;">
                    <img src="${escapeHtml(img)}" alt="" width="${width}" height="${height}" style="display:block;width:${width}px;height:${height}px;border:0;margin:0 auto 12px;" />
                    <h2 style="margin:0 0 8px;font-size:24px;line-height:1.2;font-weight:800;color:#13233b;">${escapeHtml(toolboxCard.heading)}</h2>
                    <p style="margin:0 0 14px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#4a5262;">${escapeHtml(toolboxCardCopy(segmentSlug))}</p>
                    <a href="${escapeHtml(absoluteUrl(path))}" style="display:inline-block;background:#14532D;color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:10px 16px;border-radius:4px;">${escapeHtml(toolboxCard.button)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

function toolboxCardText(segmentSlug: string): string[] {
  const path = toolboxCardHref(segmentSlug, "email");
  if (!path) return [];
  return [toolboxCard.heading, toolboxCardCopy(segmentSlug), `${toolboxCard.button}: ${absoluteUrl(path)}`, ""];
}

function issueUnsubscribe(segmentSlug: string, options: IssueRenderOptions): string {
  if (options.unsubscribeUrl) return options.unsubscribeUrl;
  return options.mode === "broadcast" ? "{{{RESEND_UNSUBSCRIBE_URL}}}" : absoluteUrl(unsubscribePath(segmentSlug));
}

function issuePreferences(options: IssueRenderOptions): string {
  return options.preferencesUrl || absoluteUrl("/preferences");
}

/** Signed page link for one reader. The list header uses the API form of the same token. */
export function signedUnsubscribeUrl(email: string, segmentSlug: string): string | undefined {
  const secret = tokenSecret();
  if (!secret) return undefined;
  return absoluteUrl(
    unsubscribePath(
      segmentSlug,
      signToken({ email, segment: segmentSlug, purpose: "unsubscribe" }, secret),
    ),
  );
}

/** One-click clients POST the List-Unsubscribe URL, so that URL is the API, not the page. */
export function oneClickUnsubscribeUrl(unsubscribeUrl: string): string {
  let parsed: URL;
  try {
    parsed = new URL(unsubscribeUrl);
  } catch {
    return unsubscribeUrl;
  }
  const token = parsed.searchParams.get("token");
  if (!token) return unsubscribeUrl;
  const endpoint = new URL("/api/unsubscribe", parsed.origin);
  endpoint.searchParams.set("token", token);
  return endpoint.toString();
}

export function listUnsubscribeHeaders(unsubscribeUrl: string): Record<string, string> {
  const target = oneClickUnsubscribeUrl(unsubscribeUrl);
  const headers: Record<string, string> = {
    "List-Unsubscribe": `<${target}>`,
  };
  try {
    if (new URL(target).pathname === "/api/unsubscribe") {
      headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
    }
  } catch {
    // A placeholder or relative link cannot take the one-click POST header.
  }
  return headers;
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

function emailSiteHeader(issue: Issue): string {
  const segment = getSegment(issue.segment);
  const active = segment?.status === "active" ? segment : undefined;
  const wordmark = active ? sectionWordmark(segmentHeaderName(active)) : site.name;
  const home = absoluteUrl(active ? `/${active.slug}` : "/");
  const sponsor = absoluteUrl("/sponsor");
  const about = absoluteUrl("/about");
  const directory = absoluteUrl(active ? toolDirectoryPath(active) : "/aviation/toolbox");
  const directoryLabel = active ? toolDirectoryLabel(active) : "Toolbox";
  const subscribe = absoluteUrl(active ? `/${active.slug}/subscribe` : "/subscribe");
  const navLink =
    "color:#f6f3ec;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.2;";
  const nameStyle =
    "color:#f6f3ec;text-decoration:none;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.15;";
  return `<tr>
            <td bgcolor="#122033" style="background-color:#122033;border-radius:8px;padding:16px 20px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                <tr>
                  <td align="left" valign="middle">
                    <table role="presentation" align="left" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;">
                      <tr>
                        <td valign="middle" align="center" width="32" height="32" bgcolor="#122033" style="width:32px;height:32px;border:1px solid #c8b48a;text-align:center;vertical-align:middle;font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:32px;mso-line-height-rule:exactly;color:#f3ead8;">
                          <a href="${escapeHtml(home)}" style="color:#f3ead8;text-decoration:none;">V</a>
                        </td>
                        <td width="10" style="width:10px;font-size:0;line-height:0;">&nbsp;</td>
                        <td valign="middle" style="vertical-align:middle;">
                          <a href="${escapeHtml(home)}" style="${nameStyle}">${escapeHtml(wordmark)}</a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td align="right" style="padding:12px 0 0;text-align:right;">
                    <table role="presentation" align="right" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-left:auto;">
                      <tr>
                        <td valign="middle" style="padding:0 16px 0 0;"><a href="${escapeHtml(sponsor)}" style="${navLink}">Sponsor</a></td>
                        <td valign="middle" style="padding:0 16px 0 0;"><a href="${escapeHtml(about)}" style="${navLink}">About</a></td>
                        <td valign="middle" style="padding:0 16px 0 0;"><a href="${escapeHtml(directory)}" style="${navLink}">${escapeHtml(directoryLabel)}</a></td>
                        <td valign="middle" style="border:1px solid #c8b48a;padding:4px 10px;"><a href="${escapeHtml(subscribe)}" style="${navLink}">Subscribe</a></td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;
}

/** Gray band between the navy header and the title card. Outlook keeps a spacer row and drops margin. */
function emailHeaderGap(): string {
  return `<tr>
      <td height="22" bgcolor="#f3f4f6" style="height:22px;line-height:22px;font-size:1px;mso-line-height-rule:exactly;background-color:#f3f4f6;">&nbsp;</td>
    </tr>`;
}

function issueHeaderHtml(title: string, numericDate: string): string {
  return `<tr>
            <td bgcolor="#13233b" style="background:#13233b;border-radius:8px;padding:26px 20px;">
              <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:30px;line-height:1.15;font-weight:normal;color:#ffffff;">${escapeHtml(title)}<span style="color:#c9b98f;"> · ${escapeHtml(numericDate)}</span></h1>
            </td>
          </tr>`;
}

function jumpEmailHtml(sections: IssueSectionView[]): string {
  const chips = sections
    .map((section, index) => {
      const topic = section.topic ?? "Tool Highlights";
      const number = String(index + 1).padStart(2, "0");
      const style =
        "display:inline-block;border:1px solid #c9d0db;border-radius:20px;padding:5px 12px;margin:0 6px 8px 0;font-size:13px;color:#13233b;background:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;";
      return `<a href="#${escapeHtml(sectionAnchor(topic))}" style="${style}"><b style="color:#14532D;">${number}</b> ${escapeHtml(sectionHeadingLabel(chipLabel(topic)))}</a>`;
    })
    .join("");
  return `<tr>
            <td style="padding:16px 20px 0;">
              <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#6b7280;margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;">Jump to</div>
              ${chips}
            </td>
          </tr>`;
}

const issueActionLinkStyle =
  "color:#14532D;font-weight:700;text-decoration:underline;white-space:nowrap;word-break:normal;";

function issueActionsEmailHtml(issue: Issue, archive: string, preferences: string): string {
  const mailto = escapeHtml(forwardMailto(issue));
  const sep = `<span style="color:#8a8175;font-weight:400;white-space:nowrap;"> • </span><wbr>`;
  return `<tr>
            <td class="vz-actions" align="center" style="padding:12px 6px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.4;letter-spacing:0.03em;text-align:center;white-space:nowrap;word-break:normal;">
              <a href="${escapeHtml(forwardedSubscribeUrl)}" style="${issueActionLinkStyle}">SUBSCRIBE</a>${sep}<a href="${mailto}" style="${issueActionLinkStyle}">FORWARD TO A COLLEAGUE</a>${sep}<a href="${escapeHtml(archive)}" style="${issueActionLinkStyle}">READ ON WEB</a>${sep}<a href="${escapeHtml(preferences)}" style="${issueActionLinkStyle}">CUSTOMIZE</a>
            </td>
          </tr>`;
}

function issueActionsText(issue: Issue, archive: string, preferences: string): string {
  return `SUBSCRIBE: ${forwardedSubscribeUrl} • FORWARD TO A COLLEAGUE: ${forwardMailto(issue)} • READ ON WEB: ${archive} • CUSTOMIZE: ${preferences}`;
}

function postalEmailHtml(): string {
  const postal = site.postalAddress.trim();
  if (!postal) return "";
  return `<p style="margin:0 0 8px;text-align:center;">${escapeHtml(postal)}</p>`;
}

export function renderIssueEmail(issue: Issue, options: IssueRenderOptions): string {
  const segment = getSegment(issue.segment);
  const editionName = segment ? segmentDisplayName(segment) : issue.segment;
  const absolute = true;
  const archive = absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
  const unsubscribe = issueUnsubscribe(issue.segment, options);
  const preferences = issuePreferences(options);
  const preview = options.preheader ?? issue.preheader;
  const intro = options.introHtml
    ? `<tr><td style="padding:16px 20px 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1c1915;">${options.introHtml}</td></tr>`
    : "";
  const primary = resolveSlot("primary", issue.sponsors.primary);
  const secondary = resolveSlot("secondary", issue.sponsors.secondary);
  const visibleSections = sectionsForReader(issue, options.excludedSections);
  const ratesUrl = sectionSponsorRatesUrl(issue);

  const tools = visibleSections
    .map((section, index) => sectionEmailHtml(section, absolute, index, ratesUrl))
    .join("");

  const sample = issue.sample
    ? `<tr><td style="padding:16px 28px 0;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#1c1915;"><p style="margin:0;padding:12px 14px;background:#f7efe2;border:1px solid #8d6b3a;">Sample issue. The tools and sponsor in this edition are fictional placeholders. They are not endorsements and not paid placements.</p></td></tr>`
    : "";
  const directoryLink = issue.segment === "aviation" ? null : issueDirectoryLink(issue.segment);
  const directoryRow = directoryLink
    ? `<tr>
            <td style="padding:8px 20px 0;font-family:Arial,sans-serif;font-size:13px;line-height:1.4;">
              <a href="${escapeHtml(directoryLink.href)}" style="color:#14532D;text-decoration:underline;">${escapeHtml(directoryLink.label)}</a>
            </td>
          </tr>`
    : "";
  const product = issue.lead.productUrl
    ? `<p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">Product: <a href="${escapeHtml(href(issue.lead.productUrl, absolute))}" style="color:#14532D;">${escapeHtml(issue.lead.productUrl)}</a></p>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(issue.subject)}</title>
  <style>
    @media only screen and (max-width: 680px) {
      .vz-wrap { width: 100% !important; max-width: 100% !important; }
      .vz-stack, .vz-stack tbody, .vz-stack tr, .vz-stack td { display: block !important; width: 100% !important; max-width: 100% !important; }
      .vz-actions { font-size: 10px !important; letter-spacing: 0 !important; padding-left: 0 !important; padding-right: 0 !important; }
    }
    @media only screen and (max-width: 380px) {
      .vz-actions { font-size: 9px !important; }
    }
    @media only screen and (max-width: 330px) {
      .vz-actions { white-space: normal !important; }
    }
  </style>
</head>
<body bgcolor="#d5dbe3" style="margin:0;padding:0;background-color:#d5dbe3;">
  <div style="display:none;max-height:0;overflow:hidden;color:#d5dbe3;">${escapeHtml(preview)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#d5dbe3" style="background-color:#d5dbe3;">
    <tr>
      <td align="center" bgcolor="#d5dbe3" style="background-color:#d5dbe3;padding:28px 12px;">
        <!--[if mso]>
        <table role="presentation" align="center" width="640" cellpadding="0" cellspacing="0" border="0"><tr><td>
        <![endif]-->
        <table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" class="vz-wrap" bgcolor="#ffffff" style="width:640px;max-width:640px;border-collapse:separate;border-spacing:0;background-color:#ffffff;border-radius:12px;">
          <tr>
            <td bgcolor="#ffffff" style="background-color:#ffffff;border:1px solid #cfd5de;border-radius:12px;padding:12px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f3f4f6" style="width:100%;border-collapse:separate;border-spacing:0;background-color:#f3f4f6;table-layout:fixed;word-break:break-word;">
          ${emailSiteHeader(issue)}
          ${emailHeaderGap()}
          ${issueHeaderHtml(issue.subject, formatNumericDate(issue.date))}
          ${issueActionsEmailHtml(issue, archive, preferences)}
          ${directoryRow}
          ${jumpEmailHtml(visibleSections)}
          ${intro}
          ${sample}
          ${slotHtml(primary, absolute)}
          ${whatWeDoEmailHtml(preferences)}
          <tr>
            <td style="padding:14px 20px 0;">
              <div style="background:#ffffff;border-radius:8px;border-top:5px solid #14532D;padding:22px;">
                <table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:0 0 8px;">
                  <tr>
                    ${emailIconCell(issue.lead.kicker, issue.lead.kicker, 28)}
                    <td valign="middle" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#14532D;">${escapeHtml(topStoryLabel)}</td>
                  </tr>
                </table>
                <h2 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.25;font-weight:800;color:#13233b;">${escapeHtml(issue.lead.title)}</h2>
                <p style="margin:0 0 12px;font-family:Arial,sans-serif;font-size:15px;line-height:1.55;color:#4a5262;">${escapeHtml(issue.lead.summary)}</p>
                ${whyPaysHtml(issue.lead.whyItMatters)}
                <p style="margin:10px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">Source: <a href="${escapeHtml(href(issue.lead.sourceUrl, absolute))}" style="color:#14532D;">${escapeHtml(issue.lead.sourceName)}</a></p>
                ${product}
              </div>
            </td>
          </tr>
          ${tools}
          ${slotHtml(secondary, absolute)}
          ${toolboxCardEmailHtml(issue.segment)}
          ${glossaryEmailHtml(issue)}
          ${issueActionsEmailHtml(issue, archive, preferences)}
          <tr>
            <td style="padding:16px 20px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5f584e;">
              <p style="margin:0 0 8px;">You are receiving this because you confirmed a subscription to the Vizonix ${escapeHtml(editionName)} briefing. A mention is not an endorsement. Sponsored slots are labeled.</p>
              <div class="vz-footer-contact" align="center" style="text-align:center;">
                ${postalEmailHtml()}
                <p style="margin:0 0 8px;text-align:center;">Contact us at: <a href="mailto:${escapeHtml(site.email)}" style="color:#14532D;">${escapeHtml(site.email)}</a></p>
                <p style="margin:0;text-align:center;"><a href="${escapeHtml(unsubscribe)}" style="color:#14532D;">Unsubscribe</a></p>
              </div>
            </td>
          </tr>
              </table>
            </td>
          </tr>
        </table>
        <!--[if mso]>
        </td></tr></table>
        <![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function renderIssueText(issue: Issue, options: IssueRenderOptions): string {
  const segment = getSegment(issue.segment);
  const editionName = segment ? segmentDisplayName(segment) : issue.segment;
  const archive = absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
  const directoryLink = issue.segment === "aviation" ? null : issueDirectoryLink(issue.segment);
  const unsubscribe = issueUnsubscribe(issue.segment, options);
  const preferences = issuePreferences(options);

  function slotLines(label: string, creative: SponsorCreative | null, name: SlotName): string[] {
    const resolved = resolveSlot(name, creative);
    const url = href(resolved.creative.ctaUrl, true);
    return [label, resolved.creative.name, resolved.creative.copy, `${resolved.creative.cta}: ${url}`, ""];
  }

  const headerName = segment ? segmentHeaderName(segment) : editionName;
  const lines = [
    sectionWordmark(headerName),
    `${issue.subject} · ${formatNumericDate(issue.date)}`,
    "",
    issueActionsText(issue, archive, preferences),
    "",
    whatWeDo.heading.toUpperCase(),
    whatWeDoBody(),
    `${customizeCard.action}: ${preferences}`,
    "",
    ...(directoryLink ? [`${directoryLink.label}: ${directoryLink.href}`] : []),
    "",
    ...(options.introText ? [options.introText, ""] : []),
    ...(issue.sample
      ? ["Sample issue. The tools and sponsor in this edition are fictional placeholders.", ""]
      : []),
    ...slotLines("PRIMARY SPONSOR", issue.sponsors.primary, "primary"),
    topStoryLabel.toUpperCase(),
    issue.lead.title,
    issue.lead.summary,
    `${whyItPaysLabel}: ${issue.lead.whyItMatters}`,
    `Source: ${issue.lead.sourceName} (${href(issue.lead.sourceUrl, true)})`,
    ...(issue.lead.productUrl ? [`Product: ${href(issue.lead.productUrl, true)}`] : []),
    "",
    ...sectionsForReader(issue, options.excludedSections).flatMap((section) =>
      sectionEmailText(section, sectionSponsorRatesUrl(issue)),
    ),
    ...slotLines("SECONDARY SPONSOR", issue.sponsors.secondary, "secondary"),
    ...toolboxCardText(issue.segment),
    ...glossaryEmailText(issue),
    issueActionsText(issue, archive, preferences),
    ...(site.postalAddress.trim() ? [site.postalAddress.trim()] : []),
    `Contact us at: ${site.email}`,
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
  preferencesUrl = absoluteUrl("/preferences"),
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
  preferencesUrl = absoluteUrl("/preferences"),
): WelcomeMessage {
  const paragraphs = welcomeParagraphs(sectionName);
  const text = [
    ...paragraphs,
    `Section: ${sectionUrl}`,
    `Manage your topics: ${preferencesUrl}`,
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
              <p style="margin:0 0 8px;font-size:13px;color:#5f584e;"><a href="${escapeHtml(preferencesUrl)}" style="color:#1e4636;">Manage your topics</a></p>
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
  const preferencesUrl = input.preferencesUrl || absoluteUrl("/preferences");
  const subject = `Confirm your Vizonix ${input.sectionName} briefing`;
  const text = [
    `Confirm your Vizonix ${input.sectionName} briefing.`,
    "",
    "You are not subscribed until you open this link and confirm:",
    input.confirmUrl,
    "",
    `Manage your topics: ${preferencesUrl}`,
    "",
    "If you did not ask for this, ignore the email. The address will stay off the list.",
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
              <p style="margin:0 0 8px;font-size:13px;"><a href="${escapeHtml(preferencesUrl)}" style="color:#1e4636;">Manage your topics</a></p>
              <p style="margin:0;font-size:13px;color:#5f584e;">If you did not ask for this, ignore the email. The address will stay off the list.</p>
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
