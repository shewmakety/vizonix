import { AdminFrame } from "@/components/admin/AdminFrame";
import { importLegacyBookings } from "@/lib/bookings";
import { formatShortDate } from "@/lib/dates";
import { adminSignedIn, loadAdmin } from "@/lib/admin-gate";
import { getSegment } from "@/lib/segments";
import { placementLabel } from "@/lib/sponsor-labels";
import { listBookings, listSponsors } from "@/lib/sponsor-store";

function dollars(price: number | null): string {
  if (price == null) return "Not set";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

export default async function BookingsPage() {
  if (!(await adminSignedIn())) return null;
  const loaded = await loadAdmin(async () => {
    await importLegacyBookings();
    const [bookings, sponsors] = await Promise.all([listBookings(), listSponsors()]);
    return { bookings, sponsors };
  });
  const bookings = loaded.data?.bookings ?? [];
  const sponsors = new Map((loaded.data?.sponsors ?? []).map((sponsor) => [sponsor.id, sponsor.company]));
  return (
    <AdminFrame
      current="bookings"
      title="Bookings"
      action={
        <a className="button" href="/admin/sponsors/bookings/new">
          New booking
        </a>
      }
    >
      {loaded.problem ? <p className="notice">{loaded.problem}</p> : null}
      {bookings.length === 0 && !loaded.problem ? <p>No bookings yet.</p> : null}
      {bookings.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Section</th>
                <th>Placement</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Price</th>
                <th>Sponsor</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>{getSegment(booking.segment)?.name ?? booking.segment}</td>
                  <td>
                    <a href={`/admin/sponsors/bookings/${booking.id}`}>
                      {placementLabel(booking.segment, booking.placement)}
                    </a>
                  </td>
                  <td>
                    {formatShortDate(booking.startDate)} - {formatShortDate(booking.endDate)}
                  </td>
                  <td>{booking.status}</td>
                  <td>{dollars(booking.price)}</td>
                  <td>{(booking.sponsorId && sponsors.get(booking.sponsorId)) || booking.headline || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminFrame>
  );
}
