import type { PreparedCheckout } from "@/lib/checkout";
import { foundingSponsorCap, stripePriceEnvKey } from "@/lib/rate-card";

export type CheckoutPriceEnv = {
  standardPrice?: string;
  foundingPrice?: string;
  promotionCode?: string;
};

export type CheckoutSessionDraft = {
  mode: "payment" | "subscription";
  line_items: Array<{ price: string; quantity: number }>;
  metadata: Record<string, string>;
  discounts?: Array<{ promotion_code: string }>;
  allow_promotion_codes?: boolean;
  subscription_data?: { metadata: Record<string, string> };
};

export function countFoundingSessions(
  sessions: ReadonlyArray<{ metadata?: { founding?: string | null } | null }>,
): number {
  return sessions.filter((session) => session.metadata?.founding === "true").length;
}

/** Stripe metadata values are capped at 500 characters. Ad copy is longer than that. */
const metadataChunk = 450;

export function packAdCopy(copy: string): Record<string, string> {
  const packed: Record<string, string> = {};
  const text = copy.trim();
  if (!text) return packed;
  const count = Math.ceil(text.length / metadataChunk);
  for (let index = 0; index < count; index += 1) {
    const key = index === 0 ? "ad_copy" : `ad_copy_${index + 1}`;
    packed[key] = text.slice(index * metadataChunk, (index + 1) * metadataChunk);
  }
  return packed;
}

export function unpackAdCopy(
  metadata: Record<string, string | null | undefined> | null | undefined,
): string {
  if (!metadata) return "";
  const read = (key: string) => (metadata[key] ?? "").trim();
  const first = read("ad_copy");
  if (!first) return read("ad_copy_url");
  let text = first;
  for (let index = 2; index <= 8; index += 1) {
    const part = read(`ad_copy_${index}`);
    if (!part) break;
    text += part;
  }
  return text;
}

function sessionMetadata(order: PreparedCheckout, quantity: number): Record<string, string> {
  const metadata: Record<string, string> = {
    segment: order.segment,
    placement: order.placement,
    week_start: order.startDate,
    end_date: order.endDate,
    quantity: String(quantity),
    founding: order.founding ? "true" : "false",
    exclusivity: order.exclusivityRequested ? "true" : "false",
    ...packAdCopy(order.adCopy),
  };
  if (order.company) metadata.company = order.company;
  return metadata;
}

/**
 * One discount path only. A founding Price plus a promotion code, or a founding
 * Price plus allow_promotion_codes, would stack. Checkout sells a one-time week.
 */
export function buildCheckoutSession(
  order: PreparedCheckout,
  env: CheckoutPriceEnv,
  foundingCount: number,
): { ok: true; session: CheckoutSessionDraft } | { ok: false; status: number; error: string } {
  const quantity = order.quantity;

  const finish = (
    price: string,
    discount: { discounts: Array<{ promotion_code: string }> } | { allow_promotion_codes: boolean },
  ): { ok: true; session: CheckoutSessionDraft } => {
    const metadata = sessionMetadata(order, quantity);
    return {
      ok: true,
      session: {
        mode: "payment",
        line_items: [{ price, quantity }],
        metadata,
        ...discount,
      },
    };
  };

  if (order.founding) {
    if (foundingCount >= foundingSponsorCap) {
      return {
        ok: false,
        status: 409,
        error: `The founding rate is full. The first ${foundingSponsorCap} sponsors are already booked. Continue at the standard price.`,
      };
    }
    if (env.promotionCode) {
      if (!env.standardPrice) {
        return {
          ok: false,
          status: 503,
          error: `No Stripe price is set for this placement. Add ${stripePriceEnvKey(order.segment, order.placement, false)}.`,
        };
      }
      return finish(env.standardPrice, { discounts: [{ promotion_code: env.promotionCode }] });
    }
    if (env.foundingPrice) {
      return finish(env.foundingPrice, { allow_promotion_codes: false });
    }
    return {
      ok: false,
      status: 503,
      error: `No founding price is set. Add STRIPE_FOUNDING_PROMOTION_CODE or ${stripePriceEnvKey(order.segment, order.placement, true)}.`,
    };
  }

  if (!env.standardPrice) {
    return {
      ok: false,
      status: 503,
      error: `No Stripe price is set for this placement. Add ${stripePriceEnvKey(order.segment, order.placement, false)}.`,
    };
  }
  return finish(env.standardPrice, { allow_promotion_codes: true });
}
