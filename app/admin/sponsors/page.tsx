import { AdminFrame } from "@/components/admin/AdminFrame";
import { adminSignedIn, loadAdmin } from "@/lib/admin-gate";
import { listSponsors } from "@/lib/sponsor-store";

export default async function SponsorsPage() {
  if (!(await adminSignedIn())) return null;
  const loaded = await loadAdmin(listSponsors);
  const sponsors = loaded.data ?? [];
  return (
    <AdminFrame
      current="sponsors"
      title="Sponsors"
      action={
        <a className="button" href="/admin/sponsors/new">
          New sponsor
        </a>
      }
    >
      {loaded.problem ? <p className="notice">{loaded.problem}</p> : null}
      {sponsors.length === 0 && !loaded.problem ? <p>No sponsors yet.</p> : null}
      {sponsors.length > 0 ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Contact</th>
                <th>Email</th>
                <th>URL</th>
              </tr>
            </thead>
            <tbody>
              {sponsors.map((sponsor) => (
                <tr key={sponsor.id}>
                  <td>
                    <a href={`/admin/sponsors/${sponsor.id}`}>{sponsor.company}</a>
                  </td>
                  <td>{sponsor.contact}</td>
                  <td>{sponsor.email}</td>
                  <td>{sponsor.url || "None"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </AdminFrame>
  );
}
