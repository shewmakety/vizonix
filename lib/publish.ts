import { Resend } from "resend";
import { isIsoDate } from "@/lib/dates";
import { renderIssueEmail, renderIssueText } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { writeIssueFile } from "@/lib/content";
import { githubConfigured, writeRepoFile } from "@/lib/github";
import { indexNowTargets, pingIndexNow } from "@/lib/indexnow";
import { postIssueToLinkedIn, type LinkedInPostResult } from "@/lib/linkedin";
import { parseIssue, type Issue } from "@/lib/schema";
import { getSegment, segmentResendId } from "@/lib/segments";

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
      indexNow: await notifyIndexNow(issue, written !== "skipped"),
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
      indexNow: await notifyIndexNow(issue, true),
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

async function notifyIndexNow(issue: Issue, published: boolean) {
  if (issue.sample) return { ok: false, skipped: "sample" };
  if (!published) return { ok: false, skipped: "not published" };
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

export async function sendIssue(
  issue: Issue,
  options: { testTo?: string },
): Promise<{ mode: "broadcast" | "test"; id?: string }> {
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

  if (mode === "test") {
    if (!testTo) {
      throw new AppError(
        "No Resend segment id is set. Pass testTo or set RESEND_TEST_TO to send a single copy.",
        503,
      );
    }
    const result = await resend.emails.send({
      from,
      to: [testTo],
      subject: issue.subject,
      html: renderIssueEmail(issue, { mode: "test" }),
      text: renderIssueText(issue, { mode: "test" }),
    });
    if (result.error) throw new AppError(result.error.message, 502);
    return { mode: "test", id: result.data?.id };
  }

  const result = await resend.broadcasts.create({
    segmentId: segmentId as string,
    from,
    subject: issue.subject,
    name: `${segment.name} ${issue.date}`,
    previewText: issue.preheader,
    html: renderIssueEmail(issue, { mode: "broadcast" }),
    text: renderIssueText(issue, { mode: "broadcast" }),
    send: true,
  });
  if (result.error) throw new AppError(result.error.message, 502);
  return { mode: "broadcast", id: result.data?.id };
}
