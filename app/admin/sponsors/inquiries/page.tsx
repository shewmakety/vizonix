import { AdminFrame } from "@/components/admin/AdminFrame";
import { formatIsoDay } from "@/lib/dates";
import { adminSignedIn, loadAdmin } from "@/lib/admin-gate";
import { placementLabel } from "@/lib/sponsor-labels";
import { listInquiries } from "@/lib/sponsor-store";

export default async function InquiriesPage() {
  if (!(await adminSignedIn())) return null;
  const loaded = await loadAdmin(listInquiries);
  const inquiries = loaded.data ?? [];
  return (
    <AdminFrame
      current="inquiries"
      title="Inquiries"
      action={
        <a className="button" href="/admin/sponsors/inquiries/new">
          New inquiry
        </a>
      }
    >
      {loaded.problem ? <p className="notice">{loaded.problem}</p> : null}
      {inquiries.length === 0 && !loaded.problem ? <p>No inquiries yet.</p> : null}
      {inquiries.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Promote</th>
                <th>Slot</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((inquiry) => (
                <tr key={inquiry.id}>
                  <td>
                    <a href={`/admin/sponsors/inquiries/${inquiry.id}`}>{inquiry.company}</a>
                  </td>
                  <td>
                    {inquiry.name}
                    <div className="meta">{inquiry.email}</div>
                  </td>
                  <td>{inquiry.promote}</td>
                  <td>{inquiry.placement ? placementLabel(inquiry.segment, inquiry.placement) : ""}</td>
                  <td>{inquiry.status}</td>
                  <td>{inquiry.createdAt ? formatIsoDay(inquiry.createdAt) : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminFrame>
  );
}
