import Link from "next/link";
import { updateEarlyAccessSignup } from "@/lib/admin/actions";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { earlyAccessStatuses } from "@/lib/admin/validations";

type Signup = {
  id: string;
  email: string;
  name: string | null;
  source: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export function EarlyAccessTable({ signups }: { signups: Signup[] }) {
  return (
    <DataTable
      headers={["Email", "Name", "Source", "Status", "Notes", "Created", "Action"]}
      hasRows={signups.length > 0}
      empty="No early access signups match this view."
    >
      {signups.map((signup) => (
        <tr key={signup.id}>
          <td>{signup.email}</td>
          <td>{signup.name || "-"}</td>
          <td>{signup.source || "landing"}</td>
          <td><StatusBadge status={signup.status ?? "new"} /></td>
          <td className="admin-note-cell">{signup.notes || "-"}</td>
          <td>{new Date(signup.created_at).toLocaleDateString()}</td>
          <td>
            <form action={updateEarlyAccessSignup} className="admin-inline-form">
              <input type="hidden" name="id" value={signup.id} />
              <select name="status" defaultValue={signup.status ?? "new"}>
                {earlyAccessStatuses.map((status) => (
                  <option key={status} value={status}>{status.replaceAll("_", " ")}</option>
                ))}
              </select>
              <input name="notes" defaultValue={signup.notes ?? ""} placeholder="Internal note" />
              <button className="btn-ghost btn-sm" type="submit">Save</button>
              <Link className="btn-ghost btn-sm" href={`/admin/emails/send?email=${encodeURIComponent(signup.email)}&name=${encodeURIComponent(signup.name ?? "")}`}>
                Email
              </Link>
            </form>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
