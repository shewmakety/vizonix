import { createHash } from "crypto";
import { Resend } from "resend";
import { z } from "zod";
import { latestPublishedIssue } from "@/lib/content";
import { confirmationEmail, unsubscribeLinkEmail, welcomeIssueMessage, welcomePlainMessage } from "@/lib/email";
import { AppError } from "@/lib/errors";
import { notifyOps } from "@/lib/notify";
import { subscriberNotice } from "@/lib/owner-alerts";
import { confirmPath, unsubscribePath } from "@/lib/segment-memory";
import { absoluteUrl } from "@/lib/site";
import { getSegment, segmentResendId, type Segment } from "@/lib/segments";
import { signToken, tokenSecret, verifyToken } from "@/lib/tokens";

const emailSchema = z.string().trim().email();

export type SubscribeResult =
  | { ok: true; status: "accepted" | "confirmation_sent" | "already_subscribed" }
  | { ok: false; status: number; error: string };

function missingConfig(message: string): SubscribeResult {
  return { ok: false, status: 503, error: message };
}

export async function startDoubleOptIn(input: {
  email?: string;
  segment?: string;
  firstName?: string;
  honeypot?: string;
}): Promise<SubscribeResult> {
  if ((input.honeypot ?? "").trim()) {
    return { ok: true, status: "accepted" };
  }

  const segment = getSegment(String(input.segment ?? ""));
  if (!segment) return { ok: false, status: 400, error: "Choose a section." };

  const email = String(input.email ?? "").trim().toLowerCase();
  if (!emailSchema.safeParse(email).success) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  const secret = tokenSecret();
  const segmentId = segmentResendId(segment);
  if (!apiKey || !from || !secret || !segmentId) {
    return missingConfig(
      "The list is not configured yet. The operator still needs Resend, a from address, a token secret, and a segment id.",
    );
  }

  const resend = new Resend(apiKey);
  const existing = await resend.contacts.get({ email });
  const firstName = input.firstName?.trim().slice(0, 60) || undefined;

  if (existing.data && existing.data.unsubscribed === false) {
    await resend.contacts.segments.add({ email, segmentId });
    return { ok: true, status: "already_subscribed" };
  }

  if (!existing.data) {
    const created = await resend.contacts.create({
      email,
      firstName,
      unsubscribed: true,
      segments: [{ id: segmentId }],
    });
    if (created.error) {
      const message = created.error.message.toLowerCase();
      const duplicate = message.includes("already") || message.includes("exist");
      if (!duplicate) {
        return { ok: false, status: 502, error: "Could not save that address. Try again shortly." };
      }
    }
  } else if (firstName) {
    await resend.contacts.update({ email, firstName });
  }

  await resend.contacts.segments.add({ email, segmentId });

  const token = signToken({ email, segment: segment.slug, purpose: "confirm" }, secret);
  const confirmUrl = absoluteUrl(confirmPath(segment.slug, token));
  const message = confirmationEmail({ sectionName: segment.name, confirmUrl });
  const sent = await resend.emails.send({
    from,
    to: [email],
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (sent.error) {
    return { ok: false, status: 502, error: "Could not send the confirmation email." };
  }
  return { ok: true, status: "confirmation_sent" };
}

/** Stable Resend key so a repeated confirm cannot deliver a second welcome. */
export function welcomeIdempotencyKey(email: string, segment: string): string {
  const hash = createHash("sha256")
    .update(`${email.trim().toLowerCase()}\n${segment}`)
    .digest("hex");
  return `welcome-${segment}-${hash}`;
}

function alreadyOnSegment(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("already") || normalized.includes("exist");
}

async function sendWelcomeEmail(
  resend: Resend,
  input: { email: string; segment: Segment },
): Promise<void> {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    console.error(`Welcome email was not sent for ${input.segment.slug}: EMAIL_FROM is not set.`);
    return;
  }
  const secret = tokenSecret();
  const unsubscribeUrl = secret
    ? absoluteUrl(
        unsubscribePath(
          input.segment.slug,
          signToken({ email: input.email, segment: input.segment.slug, purpose: "unsubscribe" }, secret),
        ),
      )
    : absoluteUrl(unsubscribePath(input.segment.slug));
  const issue = latestPublishedIssue(input.segment.slug);
  const message = issue
    ? welcomeIssueMessage(issue, unsubscribeUrl)
    : welcomePlainMessage(input.segment.name, absoluteUrl(`/${input.segment.slug}`), unsubscribeUrl);
  try {
    const sent = await resend.emails.send(
      {
        from,
        to: [input.email],
        subject: message.subject,
        html: message.html,
        text: message.text,
        headers: message.headers,
      },
      { idempotencyKey: welcomeIdempotencyKey(input.email, input.segment.slug) },
    );
    if (sent.error) {
      console.error(`Welcome email was not sent for ${input.segment.slug}: ${sent.error.message}`);
    }
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(`Welcome email was not sent for ${input.segment.slug}: ${detail}`);
  }
}

export async function confirmSubscription(
  token: string,
  options?: { source?: string },
): Promise<{
  ok: true;
  message: string;
  segment: string;
} | { ok: false; status: number; error: string }> {
  const secret = tokenSecret();
  if (!secret) {
    return { ok: false, status: 503, error: "Confirmation is not configured." };
  }
  const payload = verifyToken(token, secret, "confirm");
  if (!payload) {
    return { ok: false, status: 400, error: "This confirmation link is invalid or expired." };
  }
  const segment = getSegment(payload.segment);
  if (!segment) return { ok: false, status: 400, error: "Unknown section." };

  const apiKey = process.env.RESEND_API_KEY;
  const segmentId = segmentResendId(segment);
  if (!apiKey || !segmentId) {
    return { ok: false, status: 503, error: "The list is not configured yet." };
  }

  const resend = new Resend(apiKey);
  let wasConfirmed = false;
  let firstName: string | undefined;
  try {
    const prior = await resend.contacts.get({ email: payload.email });
    wasConfirmed = prior.data?.unsubscribed === false;
    const name = prior.data?.first_name?.trim();
    if (name) firstName = name;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "unknown error";
    console.error(`Could not read the contact before confirm for ${segment.slug}: ${detail}`);
  }
  const updated = await resend.contacts.update({
    email: payload.email,
    unsubscribed: false,
  });
  if (updated.error) {
    return { ok: false, status: 502, error: "Could not confirm that address." };
  }
  const added = await resend.contacts.segments.add({
    email: payload.email,
    segmentId,
  });
  let alreadyInSegment = false;
  if (added.error) {
    if (!alreadyOnSegment(added.error.message)) {
      return {
        ok: false,
        status: 502,
        error: "The address was confirmed, but it could not be added to the section list.",
      };
    }
    alreadyInSegment = true;
  }
  if (!(wasConfirmed && alreadyInSegment)) {
    await sendWelcomeEmail(resend, { email: payload.email, segment });
    try {
      const notice = subscriberNotice({
        email: payload.email,
        name: firstName,
        segmentName: segment.name,
        confirmedAt: new Date(),
        source: options?.source,
      });
      await notifyOps(notice.subject, notice.text);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "unknown error";
      console.error(`Subscriber notice was not sent for ${segment.slug}: ${detail}`);
    }
  }
  return {
    ok: true,
    message: `${payload.email} is confirmed for the ${segment.name} briefing.`,
    segment: segment.slug,
  };
}

export async function requestUnsubscribeLink(input: {
  email?: string;
  segment?: string;
}): Promise<{ ok: true; message: string } | { ok: false; status: number; error: string }> {
  const segment = getSegment(String(input.segment ?? ""));
  if (!segment) return { ok: false, status: 400, error: "Choose a section." };
  const email = String(input.email ?? "").trim().toLowerCase();
  if (!emailSchema.safeParse(email).success) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }
  const secret = tokenSecret();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!secret || !apiKey || !from) {
    return { ok: false, status: 503, error: "Unsubscribe email is not configured yet." };
  }
  const token = signToken({ email, segment: segment.slug, purpose: "unsubscribe" }, secret);
  const unsubscribeUrl = absoluteUrl(unsubscribePath(segment.slug, token));
  const message = unsubscribeLinkEmail({ sectionName: segment.name, unsubscribeUrl });
  const resend = new Resend(apiKey);
  const sent = await resend.emails.send({
    from,
    to: [email],
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (sent.error) {
    return { ok: false, status: 502, error: "Could not send the unsubscribe email." };
  }
  return {
    ok: true,
    message: "If that address is on the list, we sent an unsubscribe link.",
  };
}

export async function unsubscribeWithToken(token: string): Promise<{
  ok: true;
  message: string;
} | { ok: false; status: number; error: string }> {
  const secret = tokenSecret();
  if (!secret) return { ok: false, status: 503, error: "Unsubscribe is not configured." };
  const payload = verifyToken(token, secret, "unsubscribe");
  if (!payload) {
    return { ok: false, status: 400, error: "This unsubscribe link is invalid or expired." };
  }
  const segment = getSegment(payload.segment);
  if (!segment) return { ok: false, status: 400, error: "Unknown section." };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { ok: false, status: 503, error: "The list is not configured yet." };

  const resend = new Resend(apiKey);
  const segmentId = segmentResendId(segment);
  if (segmentId) {
    await resend.contacts.segments.remove({ email: payload.email, segmentId });
  }
  const updated = await resend.contacts.update({
    email: payload.email,
    unsubscribed: true,
  });
  if (updated.error) {
    const message = updated.error.message.toLowerCase();
    const missing = message.includes("not found") || message.includes("could not find");
    if (!missing) {
      throw new AppError("Could not update that subscription.", 502);
    }
  }
  return {
    ok: true,
    message: `${payload.email} will no longer receive the ${segment.name} briefing.`,
  };
}
