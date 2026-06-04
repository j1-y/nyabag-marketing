import Link from "next/link";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";

type AdminUserRow = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at?: string | null;
  profile?: { name?: string | null; phone?: string | null; avatar_path?: string | null } | null;
  isAdmin: boolean;
  bookmarksCount: number;
  notesCount: number;
};

export function UserTable({ users }: { users: AdminUserRow[] }) {
  return (
    <DataTable
      headers={["Email", "Profile", "Phone", "Created", "Last sign in", "Bookmarks", "Notes", "Admin", ""]}
      hasRows={users.length > 0}
      empty="No users match this view."
    >
      {users.map((user) => (
        <tr key={user.id}>
          <td>{user.email}</td>
          <td>{user.profile?.name || "-"}</td>
          <td>{user.profile?.phone || "-"}</td>
          <td>{new Date(user.created_at).toLocaleDateString()}</td>
          <td>{user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "-"}</td>
          <td>{user.bookmarksCount}</td>
          <td>{user.notesCount}</td>
          <td>{user.isAdmin ? <StatusBadge status="admin" /> : "-"}</td>
          <td><Link className="btn-ghost btn-sm" href={`/admin/users/${user.id}`}>View</Link></td>
        </tr>
      ))}
    </DataTable>
  );
}
