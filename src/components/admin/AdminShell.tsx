import { AdminSidebar } from "@/components/admin/AdminSidebar";

type AdminShellProps = {
  children: React.ReactNode;
  adminEmail: string;
};

export function AdminShell({ children, adminEmail }: AdminShellProps) {
  return (
    <div className="admin-layout">
      <AdminSidebar />
      <main className="admin-main">
        <div className="admin-topbar">
          <span>Private control room</span>
          <strong>{adminEmail}</strong>
        </div>
        {children}
      </main>
    </div>
  );
}
