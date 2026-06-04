import { AdminHeader } from "@/components/admin/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { requireAdmin } from "@/lib/admin/auth";
import { addAdminByEmail, removeAdmin } from "@/lib/admin/actions";
import { createAdminServiceClient } from "@/lib/admin/service";

export default async function AdminSettingsPage() {
  const admin = await requireAdmin();
  const service = createAdminServiceClient();
  const [{ data: admins }, canvasBucket, avatarsBucket] = await Promise.all([
    service.from("admin_users").select("*").order("created_at", { ascending: true }),
    service.storage.getBucket("canvas-media"),
    service.storage.getBucket("profile-avatars"),
  ]);
  const { data: users } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emailById = new Map((users.users ?? []).map((user) => [user.id, user.email ?? ""]));

  return (
    <>
      <AdminHeader title="Settings" description="Configuration checks and admin user management." />
      <section className="admin-grid-two">
        <div className="admin-card">
          <h2>Environment</h2>
          <dl className="admin-dl">
            <dt>Current admin</dt><dd>{admin.email}</dd>
            <dt>Resend</dt><dd>{process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL ? "Configured" : "Missing env vars"}</dd>
            <dt>App URL</dt><dd>{process.env.NEXT_PUBLIC_APP_URL ?? "Not set"}</dd>
            <dt>canvas-media</dt><dd>{canvasBucket.data ? "Available" : "Missing"}</dd>
            <dt>profile-avatars</dt><dd>{avatarsBucket.data ? "Available" : "Missing"}</dd>
          </dl>
        </div>
        <form action={addAdminByEmail} className="admin-card admin-form">
          <h2>Add admin</h2>
          <label>
            User email
            <input name="email" type="email" placeholder="creator@nyabag.com" required />
          </label>
          <button className="btn-primary" type="submit">Add admin</button>
        </form>
      </section>
      <DataTable headers={["Email", "User id", "Role", "Created", "Action"]} hasRows={(admins ?? []).length > 0}>
        {(admins ?? []).map((row) => (
          <tr key={row.user_id}>
            <td>{emailById.get(row.user_id) || "-"}</td>
            <td>{row.user_id}</td>
            <td>{row.role}</td>
            <td>{new Date(row.created_at).toLocaleDateString()}</td>
            <td>
              <form action={removeAdmin}>
                <input type="hidden" name="user_id" value={row.user_id} />
                <button className="btn-ghost btn-sm" type="submit" disabled={row.user_id === admin.id}>Remove</button>
              </form>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
