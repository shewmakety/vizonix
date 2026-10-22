import { createHash } from "crypto";
import { Resend } from "resend";
import { formatShortDate, isIsoDate } from "@/lib/dates";
import { listUnsubscribeHeaders, renderIssueEmail, renderIssueText } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { writeIssueFile } from "@/lib/content";
import { githubConfigured, writeRepoFile } from "@/lib/github";
import { indexNowTargets, pingIndexNow } from "@/lib/indexnow";
import { postIssueToLinkedIn, type LinkedInPostResult } from "@/lib/linkedin";
import { submitSearchConsoleSitemap, type SearchConsoleResult } from "@/lib/search-console";
import { planIssueDelivery, type ReaderPref } from "@/lib/personalize";
import { loadExclusionMap } from "@/lib/prefs";
import { fillReaderLinks, PREFERENCES_HREF, signedReaderLinks, UNSUBSCRIBE_HREF } from "@/lib/reader-links";
import { parseIssue, type Issue } from "@/lib/schema";
import { getSegment, segmentResendId } from "@/lib/segments";
import { tokenSecret } from "@/lib/tokens";

export type PublishOptions = {
  send: boolean;
  write: boolean;
  allowSample?: boolean;
  testTo?: string;
  /** Set false to skip the LinkedIn company post. Defaults to posting after a real broadcast. */
  linkedin?: boolean;
};

export async function publishIssue(input: unknown, options: PublishOptions) {
  const issue = parseIssue(input);
  if (!isIsoDate(issue.date)) {
    throw new AppError("Issue date is not a real calendar date.", 400);
  }

  let written: "github" | "local" | "skipped" = "skipped";
  if (options.write) {
    written = await writeIssue(issue);
  }

  if (!options.send) {
    return {
      segment: issue.segment,
      date: issue.date,
      path: `/${issue.segment}/issues/${issue.date}`,
      written,
      delivery: null,
      ...(await indexPublishedIssue(issue, written !== "skipped")),
      linkedin: await linkedInForIssue(issue, options, null),
    };
  }

  if (issue.sample && !options.allowSample) {
    throw new AppError(
      written === "skipped"
        ? "Refusing to email a sample issue. Pass allowSample if this is intentional."
        : "The issue file was written, but a sample issue was not emailed. Pass allowSample to send it.",
      400,
    );
  }

  try {
    const delivery = await sendIssue(issue, { testTo: options.testTo });
    return {
      segment: issue.segment,
      date: issue.date,
      path: `/${issue.segment}/issues/${issue.date}`,
      written,
      delivery,
      ...(await indexPublishedIssue(issue, options.write)),
      linkedin: await linkedInForIssue(issue, options, delivery),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email failed.";
    if (written !== "skipped") {
      throw new AppError(`The issue file was written, but the email was not sent. ${message}`, 502);
    }
    throw error;
  }
}

async function linkedInForIssue(
  issue: Issue,
  options: PublishOptions,
  delivery: { mode: "broadcast" | "test" } | null,
): Promise<LinkedInPostResult> {
  if (options.linkedin === false) return { ok: false, skipped: "disabled" };
  if (!delivery || delivery.mode !== "broadcast") return { ok: false, skipped: "not a broadcast" };
  try {
    return await postIssueToLinkedIn(issue);
  } catch (error) {
    const message = error instanceof Error ? error.message : "LinkedIn post failed.";
    console.warn(`LinkedIn post failed: ${message}`);
    return { ok: false, error: message };
  }
}

type IndexNotice = { ok: boolean; skipped?: string; error?: string };

/**
 * IndexNow and Search Console run only after the issue file is written.
 * A failure is logged and cannot reject the publish, including a send that
 * already succeeded.
 */
async function indexPublishedIssue(
  issue: Issue,
  published: boolean,
): Promise<{ indexNow: IndexNotice; searchConsole: SearchConsoleResult }> {
  let indexNow: IndexNotice = { ok: false, error: "IndexNow ping failed" };
  let searchConsole: SearchConsoleResult = { ok: false, error: "Search Console submit failed" };
  try {
    indexNow = await notifyIndexNow(issue, published);
  } catch (error) {
    const message = error instanceof Error ? error.message : "IndexNow ping failed";
    console.warn(`IndexNow ping failed: ${message}`);
    indexNow = { ok: false, error: message };
  }
  try {
    searchConsole = await notifySearchConsole(issue, published);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search Console submit failed";
    console.warn(`Search Console sitemap submit failed: ${message}`);
    searchConsole = { ok: false, error: message };
  }
  return { indexNow, searchConsole };
}

async function notifyIndexNow(issue: Issue, published: boolean): Promise<IndexNotice> {
  if (issue.sample) return { ok: false, skipped: "sample" };
  if (!published) return { ok: false, skipped: "not published" };
  const result = await pingIndexNow(indexNowTargets(issue));
  if (result.skipped) console.warn(`IndexNow skipped: ${result.skipped}`);
  else if (!result.ok) console.warn(`IndexNow ping failed: ${result.error ?? "unknown error"}`);
  return result;
}

async function notifySearchConsole(issue: Issue, published: boolean): Promise<SearchConsoleResult> {
  if (issue.sample) return { ok: false, skipped: "sample" };
  if (!published) return { ok: false, skipped: "not published" };
  const result = await submitSearchConsoleSitemap();
  if (result.skipped) console.warn(`Search Console skipped: ${result.skipped}`);
  else if (!result.ok) console.warn(`Search Console sitemap submit failed: ${result.error ?? "unknown error"}`);
  return result;
}

async function writeIssue(issue: Issue): Promise<"github" | "local"> {
  const relative = `content/${issue.segment}/issues/${issue.date}.json`;
  const body = `${JSON.stringify(issue, null, 2)}\n`;
  if (process.env.VERCEL) {
    if (!githubConfigured()) {
      throw new AppError("GITHUB_TOKEN and GITHUB_REPO are required to publish on Vercel.", 503);
    }
    await writeRepoFile(relative, body, `Publish ${issue.segment} issue ${issue.date}`);
    return "github";
  }
  writeIssueFile(issue);
  return "local";
}

export const ISSUE_EMAIL_SUBJECT_PREFIX = "The VIZONIX Daily: ";

export function issueEmailSubject(subject: string, date: string): string {
  if (subject.startsWith(ISSUE_EMAIL_SUBJECT_PREFIX)) return subject;
  return `${ISSUE_EMAIL_SUBJECT_PREFIX}${formatShortDate(date)} - ${subject}`;
}

const BATCH_LIMIT = 100;

type ListedContact = { id?: string; email?: string; unsubscribed?: boolean };

function chunks<T>(items: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

function batchMessageId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const record = data as { id?: string; data?: Array<{ id?: string }> };
  if (typeof record.id === "string") return record.id;
  return record.data?.find((item) => item?.id)?.id;
}

/** Confirmed means on the segment and not unsubscribed. Pending double opt-in contacts are skipped. */
export async function listConfirmedSubscribers(resend: Resend, segmentId: string): Promise<string[]> {
  const emails: string[] = [];
  const seen = new Set<string>();
  let after: string | undefined;
  for (let page = 0; page < 500; page += 1) {
    const result = await resend.contacts.list({
      segmentId,
      limit: 100,
      ...(after ? { after } : {}),
    });
    if (result.error) throw new AppError(result.error.message, 502);
    if (!result.data) throw new AppError("The subscriber list did not load. The issue was not emailed.", 502);
    const rows = result.data.data ?? [];
    for (const row of rows as ListedContact[]) {
      const email = row.email?.trim().toLowerCase();
      if (!email || row.unsubscribed !== false || seen.has(email)) continue;
      seen.add(email);
      emails.push(email);
    }
    const lastId = rows.at(-1)?.id;
    if (!result.data?.has_more || !lastId) return emails;
    after = lastId;
  }
  throw new AppError("The subscriber list did not finish loading. The issue was not emailed.", 502);
}

export type IssueDelivery = {
  mode: "broadcast" | "test";
  id?: string;
  recipients?: number;
  groups?: number;
};

/**
 * One rendered issue per identical exclusion set, then Resend batch send.
 * A broadcast can only target a whole segment, so it cannot drop different
 * sections for different readers. Batch sends each reader their own copy,
 * keeps a signed topic link in the footer, and takes an idempotency key so a
 * retry does not deliver that chunk twice. Resend caps a batch at 100.
 */
export async function sendIssue(issue: Issue, options: { testTo?: string }): Promise<IssueDelivery> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey) throw new AppError("RESEND_API_KEY is not set.", 503);
  if (!from) throw new AppError("EMAIL_FROM is not set.", 503);

  const segment = getSegment(issue.segment);
  if (!segment) throw new AppError("Unknown segment.", 400);
  const segmentId = segmentResendId(segment);
  const testTo = options.testTo || (!segmentId ? process.env.RESEND_TEST_TO : undefined);
  const mode = testTo || !segmentId ? "test" : "broadcast";
  const resend = new Resend(apiKey);
  const subject = issueEmailSubject(issue.subject, issue.date);

  if (mode === "test") {
    if (!testTo) {
      throw new AppError(
        "No Resend segment id is set. Pass testTo or set RESEND_TEST_TO to send a single copy.",
        503,
      );
    }
    const links = signedReaderLinks(testTo, issue.segment);
    const result = await resend.emails.send({
      from,
      to: [testTo],
      subject,
      html: renderIssueEmail(issue, { mode: "test", preferencesUrl: links?.preferencesUrl, unsubscribeUrl: links?.unsubscribeUrl }),
      text: renderIssueText(issue, { mode: "test", preferencesUrl: links?.preferencesUrl, unsubscribeUrl: links?.unsubscribeUrl }),
      headers: links ? listUnsubscribeHeaders(links.unsubscribeUrl) : undefined,
    });
    if (result.error) throw new AppError(result.error.message, 502);
    return { mode: "test", id: result.data?.id };
  }

  const secret = tokenSecret();
  if (!secret) throw new AppError("TOKEN_SECRET is not set.", 503);

  const subscribers = await listConfirmedSubscribers(resend, segmentId as string);
  const stored = await loadExclusionMap(issue.segment);
  if (!stored) {
    console.warn(
      "SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is unset. Reader topic choices were not loaded. Every confirmed subscriber gets the full issue.",
    );
  }
  const prefs: ReaderPref[] = stored
    ? [...stored.entries()].map(([email, excludedSections]) => ({ email, excludedSections }))
    : [];
  const groups = planIssueDelivery(subscribers, prefs);
  console.log(
    `Personalized send for ${issue.segment} ${issue.date}: ${subscribers.length} confirmed subscribers, ${groups.length} groups.`,
  );
  for (const group of groups) {
    const label = group.excluded.length > 0 ? group.excluded.join(", ") : "(full issue)";
    console.log(`  ${group.emails.length} readers, excluded: ${label}`);
  }

  const ids: string[] = [];
  for (const group of groups) {
    const htmlTemplate = renderIssueEmail(issue, {
      mode: "broadcast",
      excludedSections: group.excluded,
      unsubscribeUrl: UNSUBSCRIBE_HREF,
      preferencesUrl: PREFERENCES_HREF,
    });
    const textTemplate = renderIssueText(issue, {
      mode: "broadcast",
      excludedSections: group.excluded,
      unsubscribeUrl: UNSUBSCRIBE_HREF,
      preferencesUrl: PREFERENCES_HREF,
    });
    const contentHash = createHash("sha256").update(htmlTemplate).digest("hex").slice(0, 12);
    const groupHash = createHash("sha256").update(group.key).digest("hex").slice(0, 12);
    const pieces = chunks(group.emails, BATCH_LIMIT);
    for (let index = 0; index < pieces.length; index += 1) {
      const messages = pieces[index].map((email) => {
        const links = signedReaderLinks(email, issue.segment, secret);
        if (!links) throw new AppError("TOKEN_SECRET is not set.", 503);
        return {
          from,
          to: [email],
          subject,
          html: fillReaderLinks(htmlTemplate, links),
          text: fillReaderLinks(textTemplate, links),
          headers: listUnsubscribeHeaders(links.unsubscribeUrl),
        };
      });
      const idempotencyKey = `issue-${issue.segment}-${issue.date}-${groupHash}-${contentHash}-${index}`;
      const result = await resend.batch.send(messages, { idempotencyKey, batchValidation: "strict" });
      if (result.error) throw new AppError(result.error.message, 502);
      const id = batchMessageId(result.data);
      if (id) ids.push(id);
    }
  }

  return {
    mode: "broadcast",
    id: ids[0],
    recipients: subscribers.length,
    groups: groups.length,
  };
}
