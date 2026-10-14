import { NextResponse } from "next/server";
import Stripe from "stripe";
import { recordPaidReservation, reservationFromSession } from "@/lib/bookings";
import { notifyOps } from "@/lib/notify";

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
    await notifyOps(
      "Vizonix checkout needs a manual booking",
      `Session ${session.id} completed without segment, placement, and week metadata.`,
    );
    return NextResponse.json({ received: true, recorded: false });
  }

  const saved = await recordPaidReservation(reservation);
  const note = [
    `Session: ${session.id}`,
    `Section: ${reservation.segment}`,
    `Placement: ${reservation.placement}`,
    `Dates: ${reservation.startDate} through ${reservation.endDate}`,
    `Founding flag: ${reservation.founding ? "yes" : "no"}`,
    `Exclusivity requested: ${reservation.exclusivityRequested ? "yes" : "no"}`,
    `Company: ${session.metadata?.company || ""}`,
    `Email: ${session.customer_email || session.customer_details?.email || ""}`,
    `Ad copy: ${session.metadata?.ad_copy_url || ""}`,
    `Stored: ${saved.stored}`,
    saved.conflict
      ? `Conflict with ${saved.conflict.id} (${saved.conflict.startDate} to ${saved.conflict.endDate}).`
      : "No date conflict.",
    saved.duplicate ? "Duplicate delivery." : "New reservation.",
  ].join("\n");

  if (!saved.duplicate) {
    await notifyOps(
      saved.conflict
        ? `Vizonix booking conflict: ${reservation.segment} ${reservation.placement}`
        : `Vizonix booking: ${reservation.segment} ${reservation.placement}`,
      note,
    );
  }

  if (saved.stored === "unstored") {
    const mailed = await notifyOps("Vizonix booking was not written to the repo", note);
    if (!mailed) {
      return NextResponse.json(
        { error: "Booking could not be stored. Set GITHUB_TOKEN or OPS_EMAIL." },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true, recorded: !saved.duplicate, stored: saved.stored });
}
