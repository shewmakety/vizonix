import { AdminFrame } from "@/components/admin/AdminFrame";
import { AvailabilityBoard } from "@/components/admin/AvailabilityBoard";
import { adminSegments, placementsBySegment } from "@/lib/admin-booking-options";
import { adminSignedIn, loadAdmin } from "@/lib/admin-gate";
import { featuredSegment, getSegment } from "@/lib/segments";
import { availabilityAnchor, markAvailability } from "@/lib/sponsor-calendar";
import { placementChoices } from "@/lib/sponsor-labels";
import { isBookingPlacement } from "@/lib/sponsor-placements";
import { listBookings, listSponsors } from "@/lib/sponsor-store";

type Props = { searchParams: Promise<{ segment?: string; placement?: string; start?: string }> };

export default async function AvailabilityPage({ searchParams }: Props) {
  if (!(await adminSignedIn())) return null;
  const query = await searchParams;
  const selected = getSegment(query.segment ?? "") ?? featuredSegment();
  const placement = query.placement && isBookingPlacement(query.placement) ? query.placement : "primary";
  const start = availabilityAnchor(query.start);
  const loaded = await loadAdmin(async () => {
    const [bookings, sponsors] = await Promise.all([listBookings(), listSponsors()]);
    return { bookings, sponsors };
  });
  const bookings = (loaded.data?.bookings ?? []).filter(
    (booking) => booking.segment === selected.slug && booking.placement === placement,
  );
  const days = markAvailability({ start, bookings, sponsors: loaded.data?.sponsors ?? [] });
  return (
    <AdminFrame current="availability" title="Availability">
      <p className="lede">
        Open dates have no live booking. Sold dates are paid, active, or comped. Held dates are pending.
      </p>
      {loaded.problem ? <p className="notice">{loaded.problem}</p> : null}
      <AvailabilityBoard
        segment={selected.slug}
        placement={placement}
        start={start}
        segments={adminSegments()}
        placements={placementsBySegment()[selected.slug] ?? placementChoices(selected.slug)}
        days={days}
      />
    </AdminFrame>
  );
}
