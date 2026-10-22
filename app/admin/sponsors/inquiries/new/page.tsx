import { AdminFrame } from "@/components/admin/AdminFrame";
import { InquiryForm } from "@/components/admin/InquiryForm";
import { adminSegments, placementsBySegment } from "@/lib/admin-booking-options";
import { adminSignedIn } from "@/lib/admin-gate";

export default async function NewInquiryPage() {
  if (!(await adminSignedIn())) return null;
  return (
    <AdminFrame current="inquiries" title="New inquiry">
      <InquiryForm
        method="POST"
        path="/api/admin/inquiries"
        returnTo="/admin/sponsors/inquiries"
        segments={adminSegments().map((segment) => ({ id: segment.slug, label: segment.name }))}
        placementsBySegment={placementsBySegment()}
        initial={{
          name: "",
          company: "",
          email: "",
          promote: "",
          budget: "",
          message: "",
          segment: "",
          placement: "",
          status: "new",
        }}
      />
    </AdminFrame>
  );
}
