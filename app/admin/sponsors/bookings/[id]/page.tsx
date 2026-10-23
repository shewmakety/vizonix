import { notFound } from "next/navigation";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { BookingForm } from "@/components/admin/BookingForm";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { adminSegments, placementsBySegment, sectionsBySegment, sponsorOptions } from "@/lib/admin-booking-options";
import { adminSignedIn, loadAdmin } from "@/lib/admin-gate";
import { getBooking } from "@/lib/sponsor-store";

type Props = { params: Promise<{ id: string }> };

export default async function EditBookingPage({ params }: Props) {
  if (!(await adminSignedIn())) return null;
  const { id } = await params;
  const loaded = await loadAdmin(async () => {
    const [booking, sponsors] = await Promise.all([getBooking(id), sponsorOptions()]);
    return { booking, sponsors };
  });
  if (loaded.problem) {
    return (
      <AdminFrame current="bookings" title="Booking">
        <p className="notice">{loaded.problem}</p>
      </AdminFrame>
    );
  }
  const booking = loaded.data?.booking;
  if (!booking) notFound();
  return (
    <AdminFrame current="bookings" title="Edit booking">
      <BookingForm
        method="PATCH"
        path={`/api/admin/bookings/${booking.id}`}
        returnTo="/admin/sponsors/bookings"
        sponsors={loaded.data?.sponsors ?? []}
        segments={adminSegments()}
        placementsBySegment={placementsBySegment()}
        sectionsBySegment={sectionsBySegment()}
        initial={{
          sponsorId: booking.sponsorId ?? "",
          segment: booking.segment,
          placement: booking.placement,
          startDate: booking.startDate,
          endDate: booking.endDate,
          status: booking.status,
          price: booking.price == null ? "" : String(booking.price),
          stripeSessionId: booking.stripeSessionId,
          headline: booking.headline,
          body: booking.body,
          cta: booking.cta,
          url: booking.url,
          logo: booking.logo,
          founding: booking.founding,
          exclusivityRequested: booking.exclusivityRequested,
        }}
      />
      <DeleteForm
        action="admin-booking"
        path={`/api/admin/bookings/${booking.id}`}
        noun="booking"
        returnTo="/admin/sponsors/bookings"
        note="The issue goes back to the house ad, or the open section line, on the dates this booking covered."
      />
    </AdminFrame>
  );
}
