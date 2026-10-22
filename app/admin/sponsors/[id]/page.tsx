import { notFound } from "next/navigation";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { SponsorForm } from "@/components/admin/SponsorForm";
import { adminSignedIn, loadAdmin } from "@/lib/admin-gate";
import { getSponsor } from "@/lib/sponsor-store";

type Props = { params: Promise<{ id: string }> };

export default async function EditSponsorPage({ params }: Props) {
  if (!(await adminSignedIn())) return null;
  const { id } = await params;
  const loaded = await loadAdmin(() => getSponsor(id));
  if (loaded.problem) {
    return (
      <AdminFrame current="sponsors" title="Sponsor">
        <p className="notice">{loaded.problem}</p>
      </AdminFrame>
    );
  }
  const sponsor = loaded.data;
  if (!sponsor) notFound();
  return (
    <AdminFrame current="sponsors" title={sponsor.company}>
      <SponsorForm
        method="PATCH"
        path={`/api/admin/sponsors/${sponsor.id}`}
        returnTo="/admin/sponsors"
        initial={{
          company: sponsor.company,
          contact: sponsor.contact,
          email: sponsor.email,
          url: sponsor.url,
          logo: sponsor.logo,
        }}
      />
      <DeleteForm
        action="admin-sponsor"
        path={`/api/admin/sponsors/${sponsor.id}`}
        noun="sponsor"
        returnTo="/admin/sponsors"
        note="Bookings that point at this sponsor stay, with the sponsor link cleared."
      />
    </AdminFrame>
  );
}
