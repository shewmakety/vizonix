import { createHash } from "crypto";
import { Resend } from "resend";
import { formatShortDate, isIsoDate } from "@/lib/dates";
import { applyReaderLinks, listUnsubscribeHeaders, renderIssueEmail, renderIssueText } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { writeIssueFile } from "@/lib/content";
import { githubConfigured, writeRepoFile } from "@/lib/github";
import { indexNowTargets, pingIndexNow } from "@/lib/indexnow";
import { postIssueToLinkedIn, type LinkedInPostResult } from "@/lib/linkedin";
import { readerLinks } from "@/lib/reader-links";
import { assertTargetedOnce, groupSubscribersByExclusion, type ReaderGroup } from "@/lib/reader-topics";
import { loadReaderPrefs } from "@/lib/reader-store";
import { parseIssue, type Issue } from "@/lib/schema";
import { getSegment, segmentResendId } from "@/lib/segments";
import { tokenSecret } from "@/lib/tokens";

/** Resend accepts at most 100 messages per batch call. */
export const PERSONAL_BATCH_LIMIT = 100;

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
      indexNow: await notifyIndexNow(issue, options.write),
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
      indexNow: await notifyIndexNow(issue, options.write),
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

async function notifyIndexNow(issue: Issue, write: boolean) {
  if (!write) return { ok: false, skipped: "no-write" };
  if (issue.sample) return { ok: false, skipped: "sample" };
  const result = await pingIndexNow(indexNowTargets(issue));
  if (result.skipped) console.warn(`IndexNow skipped: ${result.skipped}`);
  else if (!result.ok) console.warn(`IndexNow ping failed: ${result.error ?? "unknown error"}`);
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

export type IssueDelivery = {
  mode: "broadcast" | "test";
  id?: string;
  recipients?: number;
  groups?: Array<{ excluded: string[]; count: number }>;
};

type BatchSendResult = {
  data: { data?: Array<{ id?: string }>; errors?: Array<{ message?: string }> } | null;
  error: { message: string } | null;
};

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
    const secret = tokenSecret();
    const links = secret ? readerLinks(testTo, issue.segment, secret) : undefined;
    const result = await resend.emails.send({
      from,
      to: [testTo],
      subject,
      html: renderIssueEmail(issue, {
        mode: "test",
        unsubscribeUrl: links?.unsubscribeUrl,
        preferencesUrl: links?.preferencesUrl,
      }),
      text: renderIssueText(issue, {
        mode: "test",
        unsubscribeUrl: links?.unsubscribeUrl,
        preferencesUrl: links?.preferencesUrl,
      }),
      ...(links ? { headers: listUnsubscribeHeaders(links.unsubscribeUrl) } : {}),
    });
    if (result.error) throw new AppError(result.error.message, 502);
    return { mode: "test", id: result.data?.id, recipients: 1 };
  }

  if (!segmentId) {
    throw new AppError("No Resend segment id is set.", 503);
  }
  const secret = tokenSecret();
  if (!secret) throw new AppError("TOKEN_SECRET is not set.", 503);

  const confirmed = await listConfirmedSubscribers(resend, segmentId);
  const loaded = await loadReaderPrefs(issue.segment);
  if (!loaded.configured) {
    console.log("Reader prefs are not configured. Every confirmed subscriber gets the full issue.");
  }
  const plan = groupSubscribersByExclusion(confirmed, loaded.configured ? loaded.prefs : []);
  assertTargetedOnce(plan.confirmed, plan.groups);
  const groupLabel = plan.groups.length === 1 ? "group" : "groups";
  const subscriberLabel = plan.confirmed.length === 1 ? "subscriber" : "subscribers";
  console.log(
    `Personalized send: ${plan.confirmed.length} confirmed ${subscriberLabel}, ${plan.groups.length} ${groupLabel}, each reader targeted once.`,
  );
  for (const group of plan.groups) {
    const label = group.excluded.length === 0 ? "full issue" : `excluded ${group.excluded.join(", ")}`;
    const readerLabel = group.emails.length === 1 ? "reader" : "readers";
    console.log(`  ${group.emails.length} ${readerLabel}, ${label}`);
  }

  const failures: string[] = [];
  let sent = 0;
  let firstId: string | undefined;
  for (const group of plan.groups) {
    const html = renderIssueEmail(issue, { mode: "personal", excludedSections: group.excluded });
    const text = renderIssueText(issue, { mode: "personal", excludedSections: group.excluded });
    for (let offset = 0; offset < group.emails.length; offset += PERSONAL_BATCH_LIMIT) {
      const emails = group.emails.slice(offset, offset + PERSONAL_BATCH_LIMIT);
      const payload = emails.map((email) => {
        const links = readerLinks(email, issue.segment, secret);
        return {
          from,
          to: [email],
          subject,
          html: applyReaderLinks(html, links),
          text: applyReaderLinks(text, links),
          headers: listUnsubscribeHeaders(links.unsubscribeUrl),
        };
      });
      const result = (await resend.batch.send(payload, {
        idempotencyKey: batchIdempotencyKey(issue, group, emails),
        batchValidation: "permissive",
      })) as BatchSendResult;
      if (result.error) {
        throw new AppError(
          `Personalized send stopped after ${sent} of ${plan.confirmed.length} messages. ${result.error.message}`,
          502,
        );
      }
      const ids = result.data?.data ?? [];
      for (const item of ids) {
        if (!firstId && item.id) firstId = item.id;
      }
      const errors = result.data?.errors ?? [];
      sent += emails.length - errors.length;
      for (const error of errors) {
        if (error.message) failures.push(error.message);
      }
    }
  }

  if (failures.length > 0) {
    throw new AppError(
      `Personalized send finished with ${failures.length} rejected messages. ${sent} were accepted.`,
      502,
    );
  }

  return {
    mode: "broadcast",
    id: firstId,
    recipients: plan.confirmed.length,
    groups: plan.groups.map((group) => ({ excluded: group.excluded, count: group.emails.length })),
  };
}

function batchIdempotencyKey(issue: Issue, group: ReaderGroup, emails: string[]): string {
  const hash = createHash("sha256")
    .update([issue.segment, issue.date, group.excluded.join("\n"), ...emails].join("\n"))
    .digest("hex")
    .slice(0, 40);
  return `viz-${issue.date}-${hash}`;
}

async function listConfirmedSubscribers(resend: Resend, segmentId: string): Promise<string[]> {
  const emails: string[] = [];
  let after: string | undefined;
  for (let page = 0; page < 200; page += 1) {
    const result = await resend.contacts.list({
      segmentId,
      limit: 100,
      ...(after ? { after } : {}),
    });
    if (result.error || !result.data) {
      throw new AppError(result.error?.message || "Could not list confirmed subscribers.", 502);
    }
    const contacts = result.data.data ?? [];
    for (const contact of contacts) {
      if (!contact.unsubscribed && contact.email) emails.push(contact.email.trim().toLowerCase());
    }
    if (!result.data.has_more || contacts.length === 0) break;
    const next = contacts[contacts.length - 1]?.id;
    if (!next || next === after) break;
    after = next;
  }
  return emails;
}
