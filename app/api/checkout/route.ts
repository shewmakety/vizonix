import { NextResponse } from "next/server";
import Stripe from "stripe";
import { loadReservations } from "@/lib/bookings";
import { parseCheckoutRequest } from "@/lib/checkout";
import { AppError, errorMessage } from "@/lib/errors";
import { stripePriceEnvKey } from "@/lib/rate-card";
import { absoluteUrl } from "@/lib/site";
import { buildCheckoutSession, countFoundingSessions } from "@/lib/stripe-checkout";

export const runtime = "nodejs";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function envPrice(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

async function loadFoundingCount(stripe: Stripe): Promise<number> {
  let count = 0;
  let startingAfter: string | undefined;
  for (let page = 0; page < 20; page += 1) {
    const listed = await stripe.checkout.sessions.list({
      limit: 100,
      status: "complete",
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    });
    count += countFoundingSessions(listed.data);
    if (!listed.has_more) return count;
    const last = listed.data[listed.data.length - 1];
    if (!last) return count;
    startingAfter = last.id;
  }
  throw new Error("Founding purchase count is incomplete.");
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Send the sponsorship form as JSON." }, { status: 400 });
  }

  try {
    const reservations = await loadReservations();
    const parsed = parseCheckoutRequest(raw, { reservations });
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status });
    }
    if (parsed.value.honeypot) {
      return NextResponse.json({ url: absoluteUrl("/sponsor?status=received") });
    }

    const stripe = stripeClient();
    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not configured yet. Use the inquiry form on the sponsor page." },
        { status: 503 },
      );
    }

    const order = parsed.value;
    const foundingKey = stripePriceEnvKey(order.segment, order.placement, true);
    const standardKey = stripePriceEnvKey(order.segment, order.placement, false);
    let foundingCount = 0;
    if (order.founding) {
      try {
        foundingCount = await loadFoundingCount(stripe);
      } catch {
        return NextResponse.json(
          {
            error: "The founding rate could not be confirmed. Try again, or leave the founding box unchecked.",
          },
          { status: 503 },
        );
      }
    }

    const built = buildCheckoutSession(
      order,
      {
        standardPrice: envPrice(standardKey),
        foundingPrice: envPrice(foundingKey),
        promotionCode: envPrice("STRIPE_FOUNDING_PROMOTION_CODE"),
      },
      foundingCount,
    );
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: built.status });
    }

    const draft = built.session;
    // Sponsorships are marketing services. Managed Payments is on by default for
    // this account and rejects a session that has no product tax code.
    const params = {
      mode: draft.mode,
      customer_email: order.email,
      line_items: draft.line_items,
      success_url: `${absoluteUrl("/sponsor/confirmed")}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: absoluteUrl("/sponsor?status=cancelled"),
      billing_address_collection: "auto",
      metadata: draft.metadata,
      managed_payments: { enabled: false },
      ...(draft.subscription_data ? { subscription_data: draft.subscription_data } : {}),
      ...(draft.discounts
        ? { discounts: draft.discounts }
        : { allow_promotion_codes: draft.allow_promotion_codes ?? false }),
    } satisfies Stripe.Checkout.SessionCreateParams & {
      managed_payments: { enabled: false };
    };
    const session = await stripe.checkout.sessions.create(params);

    if (!session.url) {
      throw new AppError("Stripe did not return a checkout URL.", 502);
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: errorMessage(error) }, { status });
  }
}
