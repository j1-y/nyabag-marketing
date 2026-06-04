import { AdminHeader } from "@/components/admin/AdminHeader";
import { UserTable } from "@/components/admin/UserTable";
import { getUsers } from "@/lib/admin/data";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : "";
  const admins = params.admins === "true";
  const users = await getUsers(q, admins);

  return (
    <>
      <AdminHeader title="Users" description="Registered users, profile metadata, counts, and admin status." />
      <form className="admin-toolbar">
        <input name="q" placeholder="Search email or name" defaultValue={q} />
        <label className="admin-check"><input type="checkbox" name="admins" value="true" defaultChecked={admins} /> Admins only</label>
        <button className="btn-ghost" type="submit">Filter</button>
      </form>
      <UserTable users={users} />
    </>
  );
}
