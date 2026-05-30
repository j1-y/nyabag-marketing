import { z } from "zod";

const urlSchema = z
  .string()
  .trim()
  .min(1, "URL is required")
  .transform((val) => (!/^https?:\/\//i.test(val) ? `https://${val}` : val))
  .pipe(z.string().url("Must be a valid URL"));

export const bookmarkCreateSchema = z.object({
  url: urlSchema,
  title: z.string().trim().max(255).optional(),
  tags: z
    .string()
    .transform((val) =>
      val
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean)
    )
    .pipe(z.string().array().max(20)),
  note: z.string().trim().max(2000).optional(),
});

export const bookmarkUpdateSchema = bookmarkCreateSchema.extend({
  id: z.string().uuid(),
});

export type BookmarkCreateInput = z.infer<typeof bookmarkCreateSchema>;
export type BookmarkUpdateInput = z.infer<typeof bookmarkUpdateSchema>;

export const profileUpdateSchema = z.object({
  name: z.string().trim().max(120, "Name must be 120 characters or less").optional(),
  email: z
    .string()
    .trim()
    .max(255, "Email must be 255 characters or less")
    .optional()
    .refine((value) => !value || z.email().safeParse(value).success, "Must be a valid email"),
  phone: z.string().trim().max(40, "Phone must be 40 characters or less").optional(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

export const noteCreateSchema = z.object({
  type: z.enum(["text", "link", "image", "video", "social"]),
  section_id: z.string().uuid().nullable().default(null),
  content: z.string().max(4000).default(""),
  media_source: z.enum(["url", "upload"]).nullable().default(null),
  media_path: z.string().max(1024).nullable().default(null),
  media_mime: z.string().max(255).nullable().default(null),
  media_name: z.string().max(255).nullable().default(null),
  x: z.coerce.number().finite(),
  y: z.coerce.number().finite(),
  width: z.coerce.number().min(100).max(1200),
  height: z.coerce.number().min(80).max(900),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#FFF9C4"),
  z_index: z.coerce.number().int().min(1),
});

export const noteUpdateSchema = noteCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export const notePositionSchema = z.object({
  id: z.string().uuid(),
  x: z.number().finite(),
  y: z.number().finite(),
  z_index: z.number().int(),
});

export const noteSizeSchema = z.object({
  id: z.string().uuid(),
  width: z.number().min(100).max(1200),
  height: z.number().min(80).max(900),
});

export const noteDeleteSchema = z.object({
  ids: z.string().uuid().array().min(1).max(100),
});

export const sectionCreateSchema = z.object({
  label: z.string().trim().min(1, "Section label is required").max(120),
  noteIds: z.string().uuid().array().min(1, "Select at least one note").max(100),
});

export const sectionUpdateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().trim().min(1, "Section label is required").max(120).optional(),
  x: z.number().finite().optional(),
  y: z.number().finite().optional(),
  width: z.number().min(180).max(4000).optional(),
  height: z.number().min(120).max(4000).optional(),
});

export const sectionMoveSchema = z.object({
  id: z.string().uuid(),
  x: z.number().finite(),
  y: z.number().finite(),
  notes: z
    .object({
      id: z.string().uuid(),
      x: z.number().finite(),
      y: z.number().finite(),
    })
    .array()
    .max(100),
});
