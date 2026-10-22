import { NextResponse } from "next/server";
import Stripe from "stripe";
import { recordPaidReservation, reservationFromSession } from "@/lib/bookings";
import { notifyOps } from "@/lib/notify";
import { manualCheckoutNotice, purchaseNotice } from "@/lib/owner-alerts";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!secret || !key) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const stripe = new Stripe(key);
  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const reservation = reservationFromSession({
    id: session.id,
    created: session.created,
    metadata: session.metadata,
    custom_fields: session.custom_fields,
  });

  if (!reservation) {
    const manual = manualCheckoutNotice(session);
    await notifyOps(manual.subject, manual.text);
    return NextResponse.json({ received: true, recorded: false });
  }

  const saved = await recordPaidReservation(reservation, {
    price: session.amount_total == null ? null : session.amount_total / 100,
    company: session.metadata?.company,
    contact: session.customer_details?.name,
    email: session.customer_email || session.customer_details?.email,
    creativeUrl: session.metadata?.ad_copy_url,
  });
  if (!saved.duplicate) {
    const alert = purchaseNotice({ session, reservation, saved });
    const mailed = await notifyOps(alert.subject, alert.text);
    if (saved.stored === "unstored" && !mailed) {
      return NextResponse.json(
        {
          error:
            "Booking could not be stored. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or RESEND_API_KEY so the ops notice can be sent.",
        },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true, recorded: !saved.duplicate, stored: saved.stored });
}
