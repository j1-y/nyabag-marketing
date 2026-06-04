import "server-only";

import { Resend } from "resend";
import { requireAdmin } from "@/lib/admin/auth";
import { createAdminServiceClient } from "@/lib/admin/service";
import { renderSubject, renderTemplate, firstNameFromName, type TemplateVariables } from "@/lib/admin/email-template";
import { logAdminActivity } from "@/lib/admin/logs";

type SendAdminEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type SendTemplateEmailInput = {
  templateId: string;
  recipientEmail: string;
  recipientName?: string;
  variables?: TemplateVariables;
};

export async function sendAdminEmail({ to, subject, html, text }: SendAdminEmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and RESEND_FROM_EMAIL must be configured.");
  }

  const resend = new Resend(apiKey);
  return resend.emails.send({ from, to, subject, html, text });
}

export async function sendTemplateEmail({
  templateId,
  recipientEmail,
  recipientName,
  variables = {},
}: SendTemplateEmailInput) {
  const admin = await requireAdmin();
  const service = createAdminServiceClient();
  const { data: template, error } = await service
    .from("email_templates")
    .select("*")
    .eq("id", templateId)
    .maybeSingle();

  if (error || !template) throw new Error("Template not found.");

  const mergedVariables = {
    name: recipientName ?? "",
    firstName: firstNameFromName(recipientName),
    email: recipientEmail,
    nyabagUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nyabag.com",
    typeformUrl: "",
    unsubscribeUrl: "",
    ...variables,
  };
  const subject = renderSubject(template.subject, mergedVariables);
  const html = renderTemplate(template.html_content, mergedVariables);
  const text = template.text_content ? renderTemplate(template.text_content, mergedVariables) : undefined;

  const { data: sendRecord } = await service
    .from("email_sends")
    .insert({
      template_id: template.id,
      recipient_email: recipientEmail,
      recipient_name: recipientName ?? null,
      subject,
      status: "pending",
      sent_by: admin.id,
    })
    .select()
    .single();

  try {
    const result = await sendAdminEmail({ to: recipientEmail, subject, html, text });
    if (result.error) throw new Error(result.error.message);

    await service
      .from("email_sends")
      .update({
        status: "sent",
        resend_email_id: result.data?.id ?? null,
        sent_at: new Date().toISOString(),
      })
      .eq("id", sendRecord?.id);
    await logAdminActivity({
      adminUserId: admin.id,
      action: "email sent",
      entityType: "email_sends",
      entityId: sendRecord?.id,
      metadata: { recipientEmail, templateId },
    });

    return { success: true, id: result.data?.id ?? null };
  } catch (sendError) {
    const message = sendError instanceof Error ? sendError.message : "Email send failed.";
    await service
      .from("email_sends")
      .update({ status: "failed", error_message: message })
      .eq("id", sendRecord?.id);
    await logAdminActivity({
      adminUserId: admin.id,
      action: "email failed",
      entityType: "email_sends",
      entityId: sendRecord?.id,
      metadata: { recipientEmail, templateId, error: message },
    });
    throw sendError;
  }
}
