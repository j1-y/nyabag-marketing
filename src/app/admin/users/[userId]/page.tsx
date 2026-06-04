import { notFound } from "next/navigation";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { getUserDetail } from "@/lib/admin/data";

type PageProps = { params: Promise<{ userId: string }> };

export default async function AdminUserDetailPage({ params }: PageProps) {
  const { userId } = await params;
  const detail = await getUserDetail(userId);
  if (!detail.user) notFound();

  return (
    <>
      <AdminHeader title="User detail" description="Practical account, profile, content, and media summary." />
      <section className="admin-grid-two">
        <div className="admin-card">
          <h2>Auth</h2>
          <dl className="admin-dl">
            <dt>Email</dt><dd>{detail.user.email}</dd>
            <dt>User id</dt><dd>{detail.user.id}</dd>
            <dt>Created</dt><dd>{new Date(detail.user.created_at).toLocaleString()}</dd>
            <dt>Last sign in</dt><dd>{detail.user.last_sign_in_at ? new Date(detail.user.last_sign_in_at).toLocaleString() : "-"}</dd>
          </dl>
        </div>
        <div className="admin-card">
          <h2>Profile</h2>
          <dl className="admin-dl">
            <dt>Name</dt><dd>{detail.profile?.name || "-"}</dd>
            <dt>Phone</dt><dd>{detail.profile?.phone || "-"}</dd>
            <dt>Avatar path</dt><dd>{detail.profile?.avatar_path || "-"}</dd>
            <dt>Updated</dt><dd>{detail.profile?.updated_at ? new Date(detail.profile.updated_at).toLocaleString() : "-"}</dd>
          </dl>
        </div>
      </section>
      <section className="admin-grid-two">
        <div className="admin-card">
          <h2>Bookmarks</h2>
          <DataTable headers={["Title", "URL", "Created"]} hasRows={detail.bookmarks.length > 0}>
            {detail.bookmarks.map((bookmark) => (
              <tr key={bookmark.id}>
                <td>{bookmark.title}</td>
                <td>{bookmark.url}</td>
                <td>{new Date(bookmark.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div className="admin-card">
          <h2>Canvas notes</h2>
          <DataTable headers={["Type", "Media", "Created"]} hasRows={detail.notes.length > 0}>
            {detail.notes.map((note) => (
              <tr key={note.id}>
                <td>{note.type}</td>
                <td>{note.media_path || note.media_mime || "-"}</td>
                <td>{new Date(note.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </DataTable>
        </div>
      </section>
    </>
  );
}
