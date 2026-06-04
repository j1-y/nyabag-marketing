import { requireAdmin } from "@/lib/admin/auth";
import { logAdminActivity } from "@/lib/admin/logs";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await logAdminActivity({ adminUserId: admin.id, action: "admin accessed dashboard" });

  return <AdminShell adminEmail={admin.email}>{children}</AdminShell>;
}
