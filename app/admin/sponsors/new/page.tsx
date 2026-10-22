import { AdminFrame } from "@/components/admin/AdminFrame";
import { SponsorForm } from "@/components/admin/SponsorForm";
import { adminSignedIn } from "@/lib/admin-gate";

export default async function NewSponsorPage() {
  if (!(await adminSignedIn())) return null;
  return (
    <AdminFrame current="sponsors" title="New sponsor">
      <SponsorForm
        method="POST"
        path="/api/admin/sponsors"
        returnTo="/admin/sponsors"
        initial={{ company: "", contact: "", email: "", url: "", logo: "" }}
      />
    </AdminFrame>
  );
}
