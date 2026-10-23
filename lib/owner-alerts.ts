import type { Reservation } from "@/lib/bookings";
import { formatNewYorkTimestamp } from "@/lib/dates";
import { getPlacement } from "@/lib/rate-card";
import { unpackAdCopy } from "@/lib/stripe-checkout";

export type PaidCheckout = {
  id: string;
  mode?: string | null;
  amount_total?: number | null;
  currency?: string | null;
  customer_email?: string | null;
  customer_details?: { email?: string | null; name?: string | null } | null;
  payment_intent?: string | { id?: string | null } | null;
  subscription?: string | { id?: string | null } | null;
  metadata?: Record<string, string | null | undefined> | null;
  discounts?: Array<{
    promotion_code?: string | { id?: string | null; code?: string | null } | null;
  }> | null;
  total_details?: { amount_discount?: number | null } | null;
  custom_fields?: Array<{
    key: string;
    text?: { value?: string | null } | null;
    dropdown?: { value?: string | null } | null;
  }> | null;
};

export type PurchaseSave = {
  stored: string;
  conflict: Pick<Reservation, "id" | "startDate" | "endDate"> | null;
  duplicate: boolean;
};

function stripeId(value: PaidCheckout["payment_intent"]): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && typeof value.id === "string" && value.id.trim()) {
    return value.id.trim();
  }
  return undefined;
}

export function formatPaidAmount(cents: number | null | undefined, currency?: string | null): string {
  if (cents == null || !Number.isFinite(cents)) return "unknown";
  const amount = (cents / 100).toFixed(2);
  const code = (currency || "usd").toLowerCase();
  if (code === "usd") return `$${amount}`;
  return `${amount} ${code.toUpperCase()}`;
}

function promotionLabels(session: PaidCheckout): string[] {
  const labels: string[] = [];
  for (const discount of session.discounts ?? []) {
    const promo = discount.promotion_code;
    if (typeof promo === "string" && promo.trim()) labels.push(promo.trim());
    else if (promo && typeof promo === "object") {
      const code = promo.code?.trim() || promo.id?.trim();
      if (code) labels.push(code);
    }
  }
  return labels;
}

function customFieldLines(session: PaidCheckout): string[] {
  const lines: string[] = [];
  for (const field of session.custom_fields ?? []) {
    const value = (field.text?.value || field.dropdown?.value || "").trim();
    if (!value) continue;
    lines.push(`${field.key}: ${value}`);
  }
  return lines;
}

export function purchaseNotice(input: {
  session: PaidCheckout;
  reservation: Reservation;
  saved: PurchaseSave;
}): { subject: string; text: string } {
  const { session, reservation, saved } = input;
  const placement = getPlacement(reservation.placement);
  const product = placement?.name || reservation.placement;
  const amount = formatPaidAmount(session.amount_total, session.currency);
  const subscriptionId = stripeId(session.subscription);
  const paymentId = stripeId(session.payment_intent);
  const subscription = session.mode === "subscription" || Boolean(subscriptionId);
  const billing = subscription ? "subscription" : "one-time";
  const dashboard = subscription
    ? subscriptionId
      ? `https://dashboard.stripe.com/subscriptions/${subscriptionId}`
      : ""
    : paymentId
      ? `https://dashboard.stripe.com/payments/${paymentId}`
      : "";
  const promos = promotionLabels(session);
  const discountCents = session.total_details?.amount_discount ?? 0;
  const founding = reservation.founding || session.metadata?.founding === "true";
  const foundingPromo = founding && (promos.length > 0 || discountCents > 0);
  const company = (session.metadata?.company || "").trim();
  const creative = unpackAdCopy(session.metadata);
  const buyer = (session.customer_details?.name || "").trim();
  const email = (session.customer_email || session.customer_details?.email || "").trim();

  const lines = [
    `Buyer: ${buyer || "Not collected"}`,
    `Email: ${email || "Not collected"}`,
    `Company: ${company || "Not collected"}`,
    `Product: ${product}`,
    `Slot: ${reservation.placement}`,
    `Segment: ${reservation.segment}`,
    `Amount paid: ${amount}`,
    `Founding: ${founding ? "yes" : "no"}`,
    `FOUNDING promo: ${foundingPromo ? "yes" : "no"}`,
    ...(promos.length ? [`Promotion code: ${promos.join(", ")}`] : []),
    `Billing: ${billing}`,
    `Requested dates: ${reservation.startDate} through ${reservation.endDate}`,
    `Ad copy: ${creative || "Not collected"}`,
    ...customFieldLines(session),
    `Exclusivity requested: ${reservation.exclusivityRequested ? "yes" : "no"}`,
    `Stripe session: ${session.id}`,
    ...(paymentId ? [`Payment: ${paymentId}`] : []),
    ...(subscriptionId ? [`Subscription: ${subscriptionId}`] : []),
    ...(dashboard ? [`Stripe Dashboard: ${dashboard}`] : []),
    saved.conflict
      ? `Date conflict: yes, overlaps ${saved.conflict.id} (${saved.conflict.startDate} to ${saved.conflict.endDate}).`
      : "Date conflict: no",
    `Stored: ${saved.stored}`,
  ];

  return {
    subject: `New Vizonix sponsor purchase: ${product} - ${amount}`,
    text: lines.join("\n"),
  };
}

export function manualCheckoutNotice(session: PaidCheckout): { subject: string; text: string } {
  const amount = formatPaidAmount(session.amount_total, session.currency);
  const subscriptionId = stripeId(session.subscription);
  const paymentId = stripeId(session.payment_intent);
  const subscription = session.mode === "subscription" || Boolean(subscriptionId);
  const dashboard = subscription
    ? subscriptionId
      ? `https://dashboard.stripe.com/subscriptions/${subscriptionId}`
      : ""
    : paymentId
      ? `https://dashboard.stripe.com/payments/${paymentId}`
      : "";
  const lines = [
    `Session ${session.id} completed without segment, placement, and week metadata.`,
    `Buyer: ${(session.customer_details?.name || "").trim() || "Not collected"}`,
    `Email: ${(session.customer_email || session.customer_details?.email || "").trim() || "Not collected"}`,
    `Amount paid: ${amount}`,
    `Billing: ${subscription ? "subscription" : "one-time"}`,
    ...(paymentId ? [`Payment: ${paymentId}`] : []),
    ...(subscriptionId ? [`Subscription: ${subscriptionId}`] : []),
    ...(dashboard ? [`Stripe Dashboard: ${dashboard}`] : []),
  ];
  return {
    subject: "Vizonix checkout needs a manual booking",
    text: lines.join("\n"),
  };
}

export function subscriberNotice(input: {
  email: string;
  name?: string;
  segmentName: string;
  confirmedAt: Date;
  source?: string;
}): { subject: string; text: string } {
  const name = input.name?.trim();
  const source = input.source?.trim();
  const lines = [
    `Email: ${input.email}`,
    ...(name ? [`Name: ${name}`] : []),
    `Segment: ${input.segmentName}`,
    `Confirmed: ${formatNewYorkTimestamp(input.confirmedAt)}`,
    ...(source ? [`Source: ${source}`] : []),
  ];
  return {
    subject: `New Vizonix subscriber: ${input.email} (${input.segmentName})`,
    text: lines.join("\n"),
  };
}
