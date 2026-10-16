import { Resend } from "resend";
import { site } from "@/lib/site";

export const defaultOpsEmail = "admin@vizonix.com";

/** Used when NOTIFY_EMAIL is unset. */
export const defaultNotifyEmails = ["admin@vizonix.com", "tyshewmake@gmail.com"];

export function parseAddressList(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const list: string[] = [];
  for (const part of raw.split(",")) {
    const address = part.trim();
    if (!address) continue;
    const key = address.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(address);
  }
  return list;
}

/**
 * Owner-alert recipients.
 * NOTIFY_EMAIL wins when it is set. Otherwise the default pair is used,
 * plus any OPS_EMAIL address that is not already in that pair.
 */
export function notifyRecipients(env: NodeJS.ProcessEnv = process.env): string[] {
  const configured = parseAddressList(env.NOTIFY_EMAIL);
  if (configured.length) return configured;
  const list = [...defaultNotifyEmails];
  for (const address of parseAddressList(env.OPS_EMAIL)) {
    if (!list.some((item) => item.toLowerCase() === address.toLowerCase())) list.push(address);
  }
  return list;
}

export function notifyFrom(env: NodeJS.ProcessEnv = process.env): string {
  const from = env.EMAIL_FROM?.trim();
  if (from) return from;
  return `Vizonix <${site.email}>`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain notice body as simple HTML. Blank lines are dropped. */
export function noticeHtml(text: string): string {
  const paragraphs = text
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map(
      (line) =>
        `<p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:14px;line-height:1.5;">${escapeHtml(line)}</p>`,
    )
    .join("");
  return `<div>${paragraphs}</div>`;
}

export async function notifyOps(
  subject: string,
  text: string,
  options?: { replyTo?: string; html?: string },
): Promise<boolean> {
  const to = notifyRecipients();
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error(`Owner notice was not sent (${subject}): RESEND_API_KEY is not set.`);
    return false;
  }
  try {
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: notifyFrom(),
      to,
      subject,
      text,
      html: options?.html ?? noticeHtml(text),
      ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
    });
    if (result?.error) {
      console.error(`Owner notice was not sent (${subject}): ${result.error.message}`);
      return false;
    }
    return true;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(`Owner notice was not sent (${subject}): ${detail}`);
    return false;
  }
}
