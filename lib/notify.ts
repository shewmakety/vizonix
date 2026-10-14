import { Resend } from "resend";

export async function notifyOps(subject: string, text: string): Promise<boolean> {
  const to = process.env.OPS_EMAIL;
  const from = process.env.EMAIL_FROM;
  const apiKey = process.env.RESEND_API_KEY;
  if (!to || !from || !apiKey) return false;
  const resend = new Resend(apiKey);
  const result = await resend.emails.send({
    from,
    to: [to],
    subject,
    text,
  });
  return !result.error;
}
