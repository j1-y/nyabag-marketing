import { z } from "zod";

export const earlyAccessStatuses = [
  "new",
  "contacted",
  "replied",
  "invited",
  "onboarded",
  "not_interested",
] as const;

export const templateStatuses = ["draft", "active", "archived"] as const;

export const sendStatuses = ["pending", "sent", "failed"] as const;

export const emailSchema = z.email().trim().toLowerCase().max(255);
export const uuidSchema = z.uuid();

export const earlyAccessUpdateSchema = z.object({
  id: uuidSchema,
  status: z.enum(earlyAccessStatuses),
  notes: z.string().trim().max(2000).optional(),
});

export const templateSchema = z.object({
  id: z.union([uuidSchema, z.literal("new")]).optional(),
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  subject: z.string().trim().min(1).max(200),
  preview_text: z.string().trim().max(220).optional(),
  html_content: z.string().trim().min(1).max(50000),
  text_content: z.string().trim().max(20000).optional(),
  status: z.enum(templateStatuses),
});

export const sendEmailSchema = z.object({
  template_id: uuidSchema,
  recipient_email: emailSchema,
  recipient_name: z.string().trim().max(120).optional(),
});

export const addAdminSchema = z.object({
  email: emailSchema,
});
