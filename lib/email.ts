import type { Issue, SponsorCreative } from "@/lib/schema";
import { absoluteUrl } from "@/lib/site";
import { escapeHtml, publicHref } from "@/lib/html";
import { getSegment } from "@/lib/segments";
import { formatLongDate } from "@/lib/dates";

export type SlotName = "primary" | "secondary" | "classified";

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
    return {
      name,
      label: slotLabel(name),
      house: false,
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

export function renderIssueEmail(
  issue: Issue,
  options: { mode: "broadcast" | "test" },
): string {
  const segment = getSegment(issue.segment);
  const sectionName = segment?.name ?? issue.segment;
  const payoff = segment?.payoffLabel ?? "Why it matters";
  const absolute = true;
  const archive = absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
  const unsubscribe =
    options.mode === "broadcast"
      ? "{{{RESEND_UNSUBSCRIBE_URL}}}"
      : absoluteUrl("/unsubscribe");
  const primary = resolveSlot("primary", issue.sponsors.primary);
  const secondary = resolveSlot("secondary", issue.sponsors.secondary);
  const classified = resolveSlot("classified", issue.sponsors.classified);

  const tools = issue.tools
    .map(
      (tool) => `
      <tr>
        <td style="padding:8px 28px 16px;font-family:Georgia,serif;color:#1c1915;">
          <p style="margin:0 0 4px;font-size:18px;"><a href="${escapeHtml(href(tool.url, absolute))}" style="color:#13233b;text-decoration:none;">${escapeHtml(tool.name)}</a></p>
          <p style="margin:0 0 6px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(tool.summary)}</p>
          <p style="margin:0;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#3d3832;"><strong>${escapeHtml(payoff)}.</strong> ${escapeHtml(tool.whyItMatters)}</p>
          <p style="margin:6px 0 0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">${escapeHtml(tool.pricing)}</p>
        </td>
      </tr>`,
    )
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

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(issue.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f1ea;">
  <div style="display:none;max-height:0;overflow:hidden;color:#f4f1ea;">${escapeHtml(issue.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:100%;background:#fbfaf6;">
          <tr>
            <td style="background:#13233b;padding:22px 28px;font-family:Georgia,serif;color:#f4f1ea;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;">Vizonix ${escapeHtml(sectionName)}</p>
              <p style="margin:8px 0 0;font-size:16px;">${escapeHtml(formatLongDate(issue.date))}</p>
            </td>
          </tr>
          ${sample}
          ${slotHtml(primary, absolute)}
          <tr>
            <td style="padding:8px 28px 0;font-family:Georgia,serif;color:#1c1915;">
              <p style="margin:0;font-family:Arial,sans-serif;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#5f584e;">${escapeHtml(issue.lead.kicker)}</p>
              <h1 style="margin:8px 0;font-size:28px;line-height:1.2;font-weight:normal;">${escapeHtml(issue.lead.title)}</h1>
              <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:16px;line-height:1.55;">${escapeHtml(issue.lead.summary)}</p>
              <p style="margin:0 0 10px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;"><strong>${escapeHtml(payoff)}.</strong> ${escapeHtml(issue.lead.whyItMatters)}</p>
              <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#5f584e;">Source: <a href="${escapeHtml(href(issue.lead.sourceUrl, absolute))}" style="color:#1e4636;">${escapeHtml(issue.lead.sourceName)}</a></p>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 28px 0;font-family:Georgia,serif;color:#1c1915;">
              <h2 style="margin:0;font-size:22px;font-weight:normal;">New tools</h2>
            </td>
          </tr>
          ${tools}
          ${slotHtml(secondary, absolute)}
          <tr>
            <td style="padding:8px 28px 16px;font-family:Georgia,serif;color:#1c1915;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:normal;">${escapeHtml(issue.playbook.title)}</h2>
              <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${escapeHtml(issue.playbook.intro)}</p>
              <ol style="margin:0;padding-left:18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${steps}</ol>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 8px;font-family:Georgia,serif;color:#1c1915;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:normal;">Quick links</h2>
              <ul style="margin:0;padding-left:18px;font-family:Arial,sans-serif;font-size:15px;line-height:1.5;">${links}</ul>
            </td>
          </tr>
          ${slotHtml(classified, absolute)}
          <tr>
            <td style="padding:8px 28px 28px;font-family:Arial,sans-serif;font-size:13px;line-height:1.5;color:#5f584e;">
              <p style="margin:0 0 8px;"><a href="${escapeHtml(archive)}" style="color:#1e4636;">Read this issue on the web</a></p>
              <p style="margin:0 0 8px;">You are receiving this because you confirmed a subscription to the Vizonix ${escapeHtml(sectionName)} briefing. A mention is not an endorsement. Sponsored slots are labeled.</p>
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

export function renderIssueText(issue: Issue, options: { mode: "broadcast" | "test" }): string {
  const segment = getSegment(issue.segment);
  const sectionName = segment?.name ?? issue.segment;
  const payoff = segment?.payoffLabel ?? "Why it matters";
  const archive = absoluteUrl(`/${issue.segment}/issues/${issue.date}`);
  const unsubscribe =
    options.mode === "broadcast"
      ? "{{{RESEND_UNSUBSCRIBE_URL}}}"
      : absoluteUrl("/unsubscribe");

  function slotLines(label: string, creative: SponsorCreative | null, name: SlotName): string[] {
    const resolved = resolveSlot(name, creative);
    const url = href(resolved.creative.ctaUrl, true);
    return [label, resolved.creative.name, resolved.creative.copy, `${resolved.creative.cta}: ${url}`, ""];
  }

  const lines = [
    `Vizonix ${sectionName}`,
    formatLongDate(issue.date),
    "",
    ...(issue.sample
      ? ["Sample issue. The tools and sponsor in this edition are fictional placeholders.", ""]
      : []),
    ...slotLines("PRIMARY SPONSOR", issue.sponsors.primary, "primary"),
    issue.lead.kicker.toUpperCase(),
    issue.lead.title,
    issue.lead.summary,
    `${payoff}. ${issue.lead.whyItMatters}`,
    `Source: ${issue.lead.sourceName} (${href(issue.lead.sourceUrl, true)})`,
    "",
    "NEW TOOLS",
    ...issue.tools.flatMap((tool) => [
      tool.name,
      tool.summary,
      `${payoff}. ${tool.whyItMatters}`,
      tool.pricing,
      href(tool.url, true),
      "",
    ]),
    ...slotLines("SECONDARY SPONSOR", issue.sponsors.secondary, "secondary"),
    issue.playbook.title.toUpperCase(),
    issue.playbook.intro,
    ...issue.playbook.steps.map((step, index) => `${index + 1}. ${step}`),
    "",
    "QUICK LINKS",
    ...issue.quickLinks.map((link) => `${link.title}: ${href(link.url, true)} (${link.note})`),
    "",
    ...slotLines("CLASSIFIED", issue.sponsors.classified, "classified"),
    `Read this issue on the web: ${archive}`,
    `Unsubscribe: ${unsubscribe}`,
  ];
  return `${lines.join("\n")}\n`;
}

export function confirmationEmail(input: {
  sectionName: string;
  confirmUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `Confirm your Vizonix ${input.sectionName} briefing`;
  const text = [
    `Confirm your Vizonix ${input.sectionName} briefing.`,
    "",
    "You are not subscribed until you open this link and confirm:",
    input.confirmUrl,
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

export function unsubscribeLinkEmail(input: {
  sectionName: string;
  unsubscribeUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = `Unsubscribe from the Vizonix ${input.sectionName} briefing`;
  const text = [
    `Use this link to leave the Vizonix ${input.sectionName} briefing:`,
    input.unsubscribeUrl,
    "",
    "The link is good for 180 days. If you did not ask for it, you can ignore this email.",
  ].join("\n");
  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#1c1915;">
  <p style="margin:24px;">Use this link to leave the Vizonix ${escapeHtml(input.sectionName)} briefing:</p>
  <p style="margin:24px;"><a href="${escapeHtml(input.unsubscribeUrl)}">Unsubscribe</a></p>
  <p style="margin:24px;color:#5f584e;">If you did not ask for this, ignore the email.</p>
</body>
</html>`;
  return { subject, html, text };
}
