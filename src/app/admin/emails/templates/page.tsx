import Link from "next/link";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { DataTable } from "@/components/admin/DataTable";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { archiveEmailTemplate, duplicateEmailTemplate } from "@/lib/admin/actions";
import { getEmailTemplates } from "@/lib/admin/data";

export default async function AdminEmailTemplatesPage() {
  const templates = await getEmailTemplates(true);

  return (
    <>
      <AdminHeader title="Email templates" description="Create, edit, duplicate, archive, and preview saved HTML templates." action={<Link className="btn-primary" href="/admin/emails/templates/new">New template</Link>} />
      <DataTable headers={["Name", "Slug", "Subject", "Status", "Updated", "Actions"]} hasRows={templates.length > 0}>
        {templates.map((template) => (
          <tr key={template.id}>
            <td>{template.name}</td>
            <td>{template.slug}</td>
            <td>{template.subject}</td>
            <td><StatusBadge status={template.status} /></td>
            <td>{new Date(template.updated_at).toLocaleDateString()}</td>
            <td>
              <div className="admin-actions">
                <Link className="btn-ghost btn-sm" href={`/admin/emails/templates/${template.id}`}>Edit</Link>
                <form action={duplicateEmailTemplate}><input type="hidden" name="id" value={template.id} /><button className="btn-ghost btn-sm">Duplicate</button></form>
                <form action={archiveEmailTemplate}><input type="hidden" name="id" value={template.id} /><button className="btn-ghost btn-sm">Archive</button></form>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
    </>
  );
}
