import { Resend } from "resend";
import { site } from "@/lib/site";

export const defaultOpsEmail = "admin@vizonix.com";

export async function notifyOps(
  subject: string,
  text: string,
  options?: { replyTo?: string },
): Promise<boolean> {
  const to = process.env.OPS_EMAIL?.trim() || defaultOpsEmail;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from: `Vizonix <${site.emailHello}>`,
    to: [to],
    subject,
    text,
    ...(options?.replyTo ? { replyTo: options.replyTo } : {}),
  });
  return !result.error;
}
