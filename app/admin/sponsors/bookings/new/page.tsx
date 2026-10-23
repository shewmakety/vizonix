import { AdminFrame } from "@/components/admin/AdminFrame";
import { BookingForm } from "@/components/admin/BookingForm";
import { adminSegments, placementsBySegment, sectionsBySegment, sponsorOptions } from "@/lib/admin-booking-options";
import { adminSignedIn, loadAdmin } from "@/lib/admin-gate";
import { todayInNewYork } from "@/lib/dates";
import { featuredSegment } from "@/lib/segments";

export default async function NewBookingPage() {
  if (!(await adminSignedIn())) return null;
  const loaded = await loadAdmin(sponsorOptions);
  if (loaded.problem) {
    return (
      <AdminFrame current="bookings" title="New booking">
        <p className="notice">{loaded.problem}</p>
      </AdminFrame>
    );
  }
  const today = todayInNewYork();
  return (
    <AdminFrame current="bookings" title="New booking">
      <BookingForm
        method="POST"
        path="/api/admin/bookings"
        returnTo="/admin/sponsors/bookings"
        sponsors={loaded.data ?? []}
        segments={adminSegments()}
        placementsBySegment={placementsBySegment()}
        sectionsBySegment={sectionsBySegment()}
        initial={{
          sponsorId: "",
          segment: featuredSegment().slug,
          placement: "primary",
          startDate: today,
          endDate: today,
          status: "paid",
          price: "",
          stripeSessionId: "",
          headline: "",
          body: "",
          cta: "",
          url: "",
          logo: "",
          founding: false,
          exclusivityRequested: false,
        }}
      />
    </AdminFrame>
  );
}
