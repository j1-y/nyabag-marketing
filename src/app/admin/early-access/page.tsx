import { AdminHeader } from "@/components/admin/AdminHeader";
import { EarlyAccessTable } from "@/components/admin/EarlyAccessTable";
import { getEarlyAccessSignups } from "@/lib/admin/data";
import { earlyAccessStatuses } from "@/lib/admin/validations";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminEarlyAccessPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const q = typeof params.q === "string" ? params.q : "";
  const status = typeof params.status === "string" ? params.status : "all";
  const signups = await getEarlyAccessSignups(q, status);

  return (
    <>
      <AdminHeader title="Early access" description="Review signups, update pipeline status, add notes, and send welcome emails." />
      <form className="admin-toolbar">
        <input name="q" placeholder="Search email or name" defaultValue={q} />
        <select name="status" defaultValue={status}>
          <option value="all">All statuses</option>
          {earlyAccessStatuses.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}
        </select>
        <button className="btn-ghost" type="submit">Filter</button>
        <a
          className="btn-ghost"
          href={`data:text/csv;charset=utf-8,${encodeURIComponent(toCsv(signups))}`}
          download="nyabag-early-access.csv"
        >
          Export CSV
        </a>
      </form>
      <EarlyAccessTable signups={signups} />
    </>
  );
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = ["email", "name", "source", "role", "current_tool", "pain_point", "status", "notes", "created_at"];
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => JSON.stringify(row[header] ?? "")).join(",")),
  ].join("\n");
}
