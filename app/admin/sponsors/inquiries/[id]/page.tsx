import { notFound } from "next/navigation";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { DeleteForm } from "@/components/admin/DeleteForm";
import { InquiryForm } from "@/components/admin/InquiryForm";
import { adminSegments, placementsBySegment } from "@/lib/admin-booking-options";
import { adminSignedIn, loadAdmin } from "@/lib/admin-gate";
import { getInquiry } from "@/lib/sponsor-store";

type Props = { params: Promise<{ id: string }> };

export default async function EditInquiryPage({ params }: Props) {
  if (!(await adminSignedIn())) return null;
  const { id } = await params;
  const loaded = await loadAdmin(() => getInquiry(id));
  if (loaded.problem) {
    return (
      <AdminFrame current="inquiries" title="Inquiry">
        <p className="notice">{loaded.problem}</p>
      </AdminFrame>
    );
  }
  const inquiry = loaded.data;
  if (!inquiry) notFound();
  return (
    <AdminFrame current="inquiries" title={inquiry.company}>
      <InquiryForm
        method="PATCH"
        path={`/api/admin/inquiries/${inquiry.id}`}
        returnTo="/admin/sponsors/inquiries"
        segments={adminSegments().map((segment) => ({ id: segment.slug, label: segment.name }))}
        placementsBySegment={placementsBySegment()}
        initial={{
          name: inquiry.name,
          company: inquiry.company,
          email: inquiry.email,
          promote: inquiry.promote,
          budget: inquiry.budget,
          message: inquiry.message,
          segment: inquiry.segment,
          placement: inquiry.placement,
          status: inquiry.status,
        }}
      />
      <DeleteForm
        action="admin-inquiry"
        path={`/api/admin/inquiries/${inquiry.id}`}
        noun="inquiry"
        returnTo="/admin/sponsors/inquiries"
      />
    </AdminFrame>
  );
}
