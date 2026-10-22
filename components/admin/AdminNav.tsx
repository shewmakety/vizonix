import { LogoutButton } from "@/components/admin/LogoutButton";

const links = [
  { href: "/admin/sponsors", id: "sponsors", label: "Sponsors" },
  { href: "/admin/sponsors/bookings", id: "bookings", label: "Bookings" },
  { href: "/admin/sponsors/inquiries", id: "inquiries", label: "Inquiries" },
  { href: "/admin/sponsors/availability", id: "availability", label: "Availability" },
] as const;

export function AdminNav({ current }: { current: (typeof links)[number]["id"] }) {
  return (
    <div className="admin-bar">
      <nav className="admin-nav" aria-label="Sponsor admin">
        {links.map((link) => (
          <a key={link.id} href={link.href} aria-current={link.id === current ? "page" : undefined}>
            {link.label}
          </a>
        ))}
      </nav>
      <LogoutButton />
    </div>
  );
}
