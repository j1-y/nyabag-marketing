import Link from "next/link";

const items = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/early-access", label: "Early Access" },
  { href: "/admin/storage", label: "Storage" },
  { href: "/admin/emails", label: "Emails" },
  { href: "/admin/logs", label: "Logs" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminSidebar() {
  return (
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-brand">
        <span>Nyabag</span>
        <small>Admin</small>
      </Link>
      <nav>
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="admin-nav-item">
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
