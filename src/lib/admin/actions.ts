"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminServiceClient } from "@/lib/admin/service";
import { renderSubject, renderTemplate, firstNameFromName } from "@/lib/admin/email-template";
import { logAdminActivity } from "@/lib/admin/logs";
import { sendTemplateEmail } from "@/lib/admin/resend";
import {
  addAdminSchema,
  earlyAccessUpdateSchema,
  sendEmailSchema,
  templateSchema,
} from "@/lib/admin/validations";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function updateEarlyAccessSignup(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = earlyAccessUpdateSchema.safeParse({
    id: formString(formData, "id"),
    status: formString(formData, "status"),
    notes: formString(formData, "notes"),
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const service = createAdminServiceClient();
  const patch = {
    status: parsed.data.status,
    notes: parsed.data.notes ?? "",
    invited_at: parsed.data.status === "invited" ? new Date().toISOString() : undefined,
  };
  const { error } = await service.from("early_access_signups").update(patch).eq("id", parsed.data.id);
  if (error) throw new Error(error.message);

  await logAdminActivity({
    adminUserId: admin.id,
    action: "early access status updated",
    entityType: "early_access_signups",
    entityId: parsed.data.id,
    metadata: { status: parsed.data.status },
  });
  revalidatePath("/admin/early-access");
}

export async function saveEmailTemplate(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const parsed = templateSchema.safeParse({
    id: formString(formData, "id") || "new",
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    subject: formString(formData, "subject"),
    preview_text: formString(formData, "preview_text"),
    html_content: formString(formData, "html_content"),
    text_content: formString(formData, "text_content"),
    status: formString(formData, "status") || "draft",
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const service = createAdminServiceClient();
  const { id, ...values } = parsed.data;
  const payload = {
    ...values,
    preview_text: values.preview_text ?? "",
    text_content: values.text_content ?? "",
    created_by: admin.id,
  };

  let data: { id: string } | null = null;
  let error: { message: string } | null = null;

  if (id && id !== "new") {
    const result = await service.from("email_templates").update(payload).eq("id", id).select("id").single();
    data = result.data;
    error = result.error;
  } else {
    const result = await service
      .from("email_templates")
      .upsert(payload, { onConflict: "slug" })
      .select("id")
      .single();
    data = result.data;
    error = result.error;
  }

  if (error || !data) throw new Error(error?.message ?? "Could not save template.");

  await logAdminActivity({
    adminUserId: admin.id,
    action: id && id !== "new" ? "template updated" : "template created",
    entityType: "email_templates",
    entityId: data.id,
  });
  revalidatePath("/admin/emails/templates");
}

export async function duplicateEmailTemplate(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = formString(formData, "id");
  const service = createAdminServiceClient();
  const { data: template } = await service.from("email_templates").select("*").eq("id", id).maybeSingle();
  if (!template) throw new Error("Template not found.");

  const { error } = await service.from("email_templates").insert({
    name: `${template.name} Copy`,
    slug: `${template.slug}-copy-${Date.now()}`,
    subject: template.subject,
    preview_text: template.preview_text,
    html_content: template.html_content,
    text_content: template.text_content,
    status: "draft",
    created_by: admin.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/emails/templates");
}

export async function archiveEmailTemplate(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = formString(formData, "id");
  const service = createAdminServiceClient();
  const { error } = await service.from("email_templates").update({ status: "archived" }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/emails/templates");
}

export async function sendTemplateEmailAction(formData: FormData): Promise<void> {
  const parsed = sendEmailSchema.safeParse({
    template_id: formString(formData, "template_id"),
    recipient_email: formString(formData, "recipient_email"),
    recipient_name: formString(formData, "recipient_name"),
  });

  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  try {
    await sendTemplateEmail({
      templateId: parsed.data.template_id,
      recipientEmail: parsed.data.recipient_email,
      recipientName: parsed.data.recipient_name,
    });
    revalidatePath("/admin/emails");
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Email failed.");
  }
}

export async function addAdminByEmail(formData: FormData): Promise<void> {
  const currentAdmin = await requireAdmin();
  const parsed = addAdminSchema.safeParse({ email: formString(formData, "email") });
  if (!parsed.success) throw new Error(parsed.error.issues[0].message);

  const service = createAdminServiceClient();
  const { data } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === parsed.data.email);
  if (!user) throw new Error("No Supabase Auth user found for that email.");

  const { error } = await service.from("admin_users").upsert({ user_id: user.id, role: "admin" }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  await logAdminActivity({
    adminUserId: currentAdmin.id,
    action: "admin added",
    entityType: "admin_users",
    entityId: user.id,
  });
  revalidatePath("/admin/settings");
}

export async function removeAdmin(formData: FormData): Promise<void> {
  const currentAdmin = await requireAdmin();
  const userId = formString(formData, "user_id");
  const service = createAdminServiceClient();
  const { count } = await service.from("admin_users").select("*", { count: "exact", head: true });
  if ((count ?? 0) <= 1) throw new Error("Cannot remove the last admin.");

  const { error } = await service.from("admin_users").delete().eq("user_id", userId);
  if (error) throw new Error(error.message);
  await logAdminActivity({
    adminUserId: currentAdmin.id,
    action: "admin removed",
    entityType: "admin_users",
    entityId: userId,
  });
  revalidatePath("/admin/settings");
}

export async function previewTemplateFromForm(formData: FormData) {
  await requireAdmin();
  const name = formString(formData, "recipient_name") || "Jayanth Kumar";
  const email = formString(formData, "recipient_email") || "hello@nyabag.com";
  const variables = {
    name,
    firstName: firstNameFromName(name),
    email,
    nyabagUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nyabag.com",
    typeformUrl: "",
    unsubscribeUrl: "",
  };

  return {
    subject: renderSubject(formString(formData, "subject"), variables),
    html: renderTemplate(formString(formData, "html_content"), variables),
  };
}
