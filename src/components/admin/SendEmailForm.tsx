import { sendTemplateEmailAction } from "@/lib/admin/actions";

type SendEmailFormProps = {
  templates: Array<{ id: string; name: string; subject: string; status: string }>;
  recipientEmail?: string;
  recipientName?: string;
};

export function SendEmailForm({ templates, recipientEmail = "", recipientName = "" }: SendEmailFormProps) {
  return (
    <form action={sendTemplateEmailAction} className="admin-card admin-form">
      <label>
        Recipient email
        <input name="recipient_email" type="email" defaultValue={recipientEmail} required />
      </label>
      <label>
        Recipient name
        <input name="recipient_name" defaultValue={recipientName} />
      </label>
      <label>
        Template
        <select name="template_id" required>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} - {template.subject}
            </option>
          ))}
        </select>
      </label>
      <button className="btn-primary" type="submit" disabled={!templates.length}>
        Send email
      </button>
      {!templates.length ? <p className="admin-muted">Create an active template before sending.</p> : null}
    </form>
  );
}
