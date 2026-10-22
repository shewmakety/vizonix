import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";
import { adminSignedIn } from "@/lib/admin-gate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sponsor admin",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await adminSignedIn())) {
    return (
      <section className="hero">
        <div className="wrap admin-wrap">
          <LoginForm />
        </div>
      </section>
    );
  }
  return children;
}
