import { AdminNav } from "@/components/admin/AdminNav";

export function AdminFrame({
  current,
  title,
  action,
  children,
}: {
  current: "sponsors" | "bookings" | "inquiries" | "availability";
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="hero">
      <div className="wrap admin-wrap">
        <AdminNav current={current} />
        <div className="section-head">
          <h1>{title}</h1>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}
