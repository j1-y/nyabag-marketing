import { saveEmailTemplate } from "@/lib/admin/actions";
import { EmailPreview } from "@/components/admin/EmailPreview";

type TemplateEditorProps = {
  template?: {
    id?: string;
    name?: string;
    slug?: string;
    subject?: string;
    preview_text?: string | null;
    html_content?: string;
    text_content?: string | null;
    status?: string;
  } | null;
};

const defaultHtml = `<p>Hi {{firstName}},</p>
<p>Thanks for joining Nyabag Early Access. You're one of the first people on the list.</p>
<p>Nyabag is a design memory workspace for saving references, notes, and visual context.</p>
<p><a href="{{nyabagUrl}}">Visit Nyabag</a></p>`;

export function TemplateEditor({ template }: TemplateEditorProps) {
  const html = template?.html_content ?? defaultHtml;
  const isEditing = Boolean(template?.id);

  return (
    <form action={saveEmailTemplate} className="admin-form-grid">
      <input type="hidden" name="id" value={template?.id ?? "new"} />
      <div className="admin-card admin-form">
        <label>
          Name
          <input name="name" defaultValue={template?.name ?? "New Nyabag Template"} required />
        </label>
        <label>
          Slug
          <input name="slug" defaultValue={template?.slug ?? "nyabag-template-new"} required />
        </label>
        <label>
          Status
          <select name="status" defaultValue={template?.status ?? "draft"}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label>
          Subject
          <input name="subject" defaultValue={template?.subject ?? (isEditing ? "You're early to Nyabag" : "Nyabag update")} required />
        </label>
        <label>
          Preview text
          <input
            name="preview_text"
            defaultValue={
              template?.preview_text ??
              "Thanks for joining Nyabag Early Access. You're one of the first people on the list."
            }
          />
        </label>
        <label>
          HTML content
          <textarea name="html_content" rows={14} defaultValue={html} required />
        </label>
        <label>
          Plain text content
          <textarea name="text_content" rows={7} defaultValue={template?.text_content ?? ""} />
        </label>
        <button className="btn-primary" type="submit">Save template</button>
      </div>
      <div className="admin-card">
        <h2>Preview</h2>
        <EmailPreview html={html} />
        <p className="admin-muted">Variables: {"{{name}}, {{email}}, {{firstName}}, {{nyabagUrl}}, {{typeformUrl}}, {{unsubscribeUrl}}"}</p>
      </div>
    </form>
  );
}
