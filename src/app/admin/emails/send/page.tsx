import { AdminHeader } from "@/components/admin/AdminHeader";
import { SendEmailForm } from "@/components/admin/SendEmailForm";
import { getEmailTemplates } from "@/lib/admin/data";

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminSendEmailPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const email = typeof params.email === "string" ? params.email : "";
  const name = typeof params.name === "string" ? params.name : "";
  const templates = (await getEmailTemplates()).filter((template) => template.status === "active");

  return (
    <>
      <AdminHeader title="Send email" description="Send one template email through Resend and record the result." />
      <SendEmailForm templates={templates} recipientEmail={email} recipientName={name} />
    </>
  );
}
