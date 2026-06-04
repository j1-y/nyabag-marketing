import { AdminHeader } from "@/components/admin/AdminHeader";
import { TemplateEditor } from "@/components/admin/TemplateEditor";
import { getEmailTemplate } from "@/lib/admin/data";

type PageProps = { params: Promise<{ templateId: string }> };

export default async function AdminTemplateEditPage({ params }: PageProps) {
  const { templateId } = await params;
  const template = templateId === "new" ? null : await getEmailTemplate(templateId);

  return (
    <>
      <AdminHeader title={template ? "Edit template" : "New template"} description="Simple HTML and plain text editing with server-side rendering at send time." />
      <TemplateEditor template={template} />
    </>
  );
}
