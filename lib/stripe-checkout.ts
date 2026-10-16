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

function sessionMetadata(order: PreparedCheckout, quantity: number): Record<string, string> {
  const metadata: Record<string, string> = {
    segment: order.segment,
    placement: order.placement,
    week_start: order.startDate,
    end_date: order.endDate,
    quantity: String(quantity),
    founding: order.founding ? "true" : "false",
    exclusivity: order.exclusivityRequested ? "true" : "false",
  };
  if (order.company) metadata.company = order.company;
  if (order.adCopyUrl) metadata.ad_copy_url = order.adCopyUrl;
  return metadata;
}

/**
 * One discount path only. A founding Price plus a promotion code, or a founding
 * Price plus allow_promotion_codes, would stack. Featured is a subscription.
 */
export function buildCheckoutSession(
  order: PreparedCheckout,
  env: CheckoutPriceEnv,
  foundingCount: number,
): { ok: true; session: CheckoutSessionDraft } | { ok: false; status: number; error: string } {
  const featured = order.placement === "featured";
  const quantity = featured ? 1 : order.quantity;
  const mode = featured ? "subscription" : "payment";

  const finish = (
    price: string,
    discount: { discounts: Array<{ promotion_code: string }> } | { allow_promotion_codes: boolean },
  ): { ok: true; session: CheckoutSessionDraft } => {
    const metadata = sessionMetadata(order, quantity);
    return {
      ok: true,
      session: {
        mode,
        line_items: [{ price, quantity }],
        metadata,
        ...discount,
        ...(mode === "subscription" ? { subscription_data: { metadata } } : {}),
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
