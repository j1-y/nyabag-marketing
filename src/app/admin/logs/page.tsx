import { AdminHeader } from "@/components/admin/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { getAdminLogs } from "@/lib/admin/data";

export default async function AdminLogsPage() {
  const logs = await getAdminLogs();

  return (
    <>
      <AdminHeader title="Logs" description="Basic admin activity trail for sensitive operations." />
      <DataTable headers={["Action", "Admin", "Entity", "Timestamp", "Metadata"]} hasRows={logs.length > 0}>
        {logs.map((log) => (
          <tr key={log.id}>
            <td>{log.action}</td>
            <td>{log.admin_user_id || "-"}</td>
            <td>{log.entity_type ? `${log.entity_type}:${log.entity_id ?? ""}` : "-"}</td>
            <td>{new Date(log.created_at).toLocaleString()}</td>
            <td className="admin-note-cell">{JSON.stringify(log.metadata ?? {})}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
