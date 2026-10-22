import { AdminFrame } from "@/components/admin/AdminFrame";
import { InquiryForm } from "@/components/admin/InquiryForm";
import { adminSignedIn } from "@/lib/admin-gate";

export default async function NewInquiryPage() {
  if (!(await adminSignedIn())) return null;
  return (
    <AdminFrame current="inquiries" title="New inquiry">
      <InquiryForm
        method="POST"
        path="/api/admin/inquiries"
        returnTo="/admin/sponsors/inquiries"
        initial={{ name: "", company: "", email: "", promote: "", budget: "", message: "", status: "new" }}
      />
    </AdminFrame>
  );
}
