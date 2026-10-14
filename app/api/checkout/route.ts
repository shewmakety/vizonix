import { NextResponse } from "next/server";
import Stripe from "stripe";
import { loadReservations } from "@/lib/bookings";
import { parseCheckoutRequest } from "@/lib/checkout";
import { AppError, errorMessage } from "@/lib/errors";
import { stripePriceEnvKey } from "@/lib/rate-card";
import { absoluteUrl } from "@/lib/site";

export const runtime = "nodejs";

function stripeClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
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
        { error: "Stripe is not configured yet. Email sponsors@vizonix.com with the week you want." },
        { status: 503 },
      );
    }

    const order = parsed.value;
    const foundingKey = stripePriceEnvKey(order.segment, order.placement, true);
    const standardKey = stripePriceEnvKey(order.segment, order.placement, false);
    const foundingPrice = process.env[foundingKey];
    const standardPrice = process.env[standardKey];
    const promotionCode = process.env.STRIPE_FOUNDING_PROMOTION_CODE;

    let priceId = standardPrice;
    const discounts: Stripe.Checkout.SessionCreateParams.Discount[] = [];
    if (order.founding && foundingPrice) {
      priceId = foundingPrice;
    } else if (order.founding && promotionCode && standardPrice) {
      discounts.push({ promotion_code: promotionCode });
    }
    if (!priceId) {
      return NextResponse.json(
        {
          error: `No Stripe price is set for this placement. Add ${order.founding ? foundingKey : standardKey} or email sponsors@vizonix.com.`,
        },
        { status: 503 },
      );
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: order.email,
      line_items: [{ price: priceId, quantity: order.quantity }],
      success_url: `${absoluteUrl("/sponsor/confirmed")}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: absoluteUrl("/sponsor?status=cancelled"),
      billing_address_collection: "auto",
      metadata: {
        segment: order.segment,
        placement: order.placement,
        week_start: order.startDate,
        end_date: order.endDate,
        quantity: String(order.quantity),
        founding: order.founding ? "true" : "false",
        exclusivity: order.exclusivityRequested ? "true" : "false",
        ...(order.company ? { company: order.company } : {}),
        ...(order.adCopyUrl ? { ad_copy_url: order.adCopyUrl } : {}),
      },
      ...(discounts.length > 0
        ? { discounts }
        : { allow_promotion_codes: true }),
    });

    if (!session.url) {
      throw new AppError("Stripe did not return a checkout URL.", 502);
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ error: errorMessage(error) }, { status });
  }
}
