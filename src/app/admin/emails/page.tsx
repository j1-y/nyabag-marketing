import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { getEmailSends } from "@/lib/admin/data";

export default async function AdminEmailsPage() {
  const sends = await getEmailSends();

  return (
    <>
      <AdminHeader
        title="Emails"
        description="Templates and individual Resend delivery records."
        action={<div className="admin-actions"><Link className="btn-ghost" href="/admin/emails/templates">Templates</Link><Link className="btn-primary" href="/admin/emails/send">Send</Link></div>}
      />
      <DataTable headers={["Recipient", "Subject", "Status", "Sent", "Error"]} hasRows={sends.length > 0}>
        {sends.map((send) => (
          <tr key={send.id}>
            <td>{send.recipient_email}</td>
            <td>{send.subject}</td>
            <td><StatusBadge status={send.status} /></td>
            <td>{send.sent_at ? new Date(send.sent_at).toLocaleString() : "-"}</td>
            <td>{send.error_message || "-"}</td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
