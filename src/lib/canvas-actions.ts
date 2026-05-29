"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  noteCreateSchema,
  notePositionSchema,
  noteSizeSchema,
  noteUpdateSchema,
} from "@/lib/validations";
import type {
  ActionResult,
  CanvasNote,
  NoteMediaSource,
  NoteType,
} from "@/lib/types";

const MEDIA_BUCKET = "canvas-media";
const SIGNED_URL_TTL = 60 * 60;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

type Supabase = Awaited<ReturnType<typeof createClient>>;

function normalizeUrl(raw: string): string | null {
  const normalized = /^https?:\/\//i.test(raw.trim())
    ? raw.trim()
    : `https://${raw.trim()}`;

  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

function safeFilename(name: string): string {
  return name
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120) || "upload";
}

async function withSignedUrl(
  supabase: Supabase,
  note: CanvasNote
): Promise<CanvasNote> {
  if (note.media_source !== "upload" || !note.media_path) return note;

  const { data, error } = await supabase.storage
    .from(MEDIA_BUCKET)
    .createSignedUrl(note.media_path, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) return note;
  return { ...note, media_url: data.signedUrl };
}

async function getUser(supabase: Supabase) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

async function getOwnedNote(
  supabase: Supabase,
  userId: string,
  id: string
): Promise<CanvasNote | null> {
  const { data, error } = await supabase
    .from("canvas_notes")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .single();

  if (error || !data) return null;
  return data as CanvasNote;
}

async function removeStoredMedia(supabase: Supabase, note: CanvasNote | null) {
  if (note?.media_source === "upload" && note.media_path) {
    await supabase.storage.from(MEDIA_BUCKET).remove([note.media_path]);
  }
}

export async function createNote(
  type: NoteType,
  x: number,
  y: number,
  color: string
): Promise<ActionResult<CanvasNote>> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: maxRow } = await supabase
    .from("canvas_notes")
    .select("z_index")
    .eq("user_id", user.id)
    .order("z_index", { ascending: false })
    .limit(1)
    .single();

  const z_index = (maxRow?.z_index ?? 0) + 1;
  const parsed = noteCreateSchema.safeParse({
    type,
    content: "",
    media_source: null,
    media_path: null,
    media_mime: null,
    media_name: null,
    x,
    y,
    width: 240,
    height: 180,
    color,
    z_index,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data, error } = await supabase
    .from("canvas_notes")
    .insert({ user_id: user.id, ...parsed.data })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/canvas");
  return { success: true, data: data as CanvasNote };
}

export async function updateNoteContent(
  id: string,
  content: string,
  color?: string,
  mediaSource?: NoteMediaSource | null
): Promise<ActionResult<CanvasNote>> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const oldNote = mediaSource !== undefined ? await getOwnedNote(supabase, user.id, id) : null;
  const normalizedContent = mediaSource === "url" ? normalizeUrl(content) : content;
  if (mediaSource === "url" && !normalizedContent) {
    return { success: false, error: "Must be a valid URL" };
  }

  const parsed = noteUpdateSchema.safeParse({
    id,
    content: normalizedContent,
    ...(color ? { color } : {}),
    ...(mediaSource !== undefined
      ? {
          media_source: mediaSource,
          media_path: null,
          media_mime: null,
          media_name: null,
        }
      : {}),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id: noteId, ...updates } = parsed.data;
  const { data, error } = await supabase
    .from("canvas_notes")
    .update(updates)
    .eq("id", noteId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  await removeStoredMedia(supabase, oldNote);
  return { success: true, data: data as CanvasNote };
}

export async function uploadNoteMedia(
  id: string,
  formData: FormData
): Promise<ActionResult<CanvasNote>> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const note = await getOwnedNote(supabase, user.id, id);
  if (!note) return { success: false, error: "Note not found" };
  if (note.type !== "image" && note.type !== "video") {
    return { success: false, error: "Only image and video notes support uploads" };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { success: false, error: "No file was selected" };
  }

  const isImage = note.type === "image" && file.type.startsWith("image/");
  const isVideo = note.type === "video" && file.type.startsWith("video/");
  if (!isImage && !isVideo) {
    return { success: false, error: `Please upload a ${note.type} file` };
  }

  const maxBytes = note.type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    const mb = Math.floor(maxBytes / 1024 / 1024);
    return { success: false, error: `File must be ${mb}MB or smaller` };
  }

  const path = `${user.id}/${note.id}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) return { success: false, error: uploadError.message };

  const { data, error } = await supabase
    .from("canvas_notes")
    .update({
      content: "",
      media_source: "upload",
      media_path: path,
      media_mime: file.type,
      media_name: file.name.slice(0, 255),
    })
    .eq("id", note.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    await supabase.storage.from(MEDIA_BUCKET).remove([path]);
    return { success: false, error: error.message };
  }

  await removeStoredMedia(supabase, note);
  revalidatePath("/canvas");
  const signed = await withSignedUrl(supabase, data as CanvasNote);
  return { success: true, data: signed };
}

export async function removeNoteMedia(id: string): Promise<ActionResult<CanvasNote>> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const note = await getOwnedNote(supabase, user.id, id);
  if (!note) return { success: false, error: "Note not found" };

  const { data, error } = await supabase
    .from("canvas_notes")
    .update({
      content: "",
      media_source: null,
      media_path: null,
      media_mime: null,
      media_name: null,
    })
    .eq("id", note.id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  await removeStoredMedia(supabase, note);
  revalidatePath("/canvas");
  return { success: true, data: data as CanvasNote };
}

export async function updateNotePosition(
  id: string,
  x: number,
  y: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = notePositionSchema.safeParse({ id, x, y, z_index: 1 });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("canvas_notes")
    .update({ x, y })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function updateNoteSize(
  id: string,
  width: number,
  height: number
): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = noteSizeSchema.safeParse({ id, width, height });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { error } = await supabase
    .from("canvas_notes")
    .update({ width, height })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: undefined };
}

export async function bringNoteToFront(id: string): Promise<ActionResult<number>> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: maxRow } = await supabase
    .from("canvas_notes")
    .select("z_index")
    .eq("user_id", user.id)
    .order("z_index", { ascending: false })
    .limit(1)
    .single();

  const newZIndex = (maxRow?.z_index ?? 0) + 1;
  const { error } = await supabase
    .from("canvas_notes")
    .update({ z_index: newZIndex })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  return { success: true, data: newZIndex };
}

export async function deleteNote(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const user = await getUser(supabase);
  if (!user) return { success: false, error: "Not authenticated" };

  const note = await getOwnedNote(supabase, user.id, id);
  const { error } = await supabase
    .from("canvas_notes")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  await removeStoredMedia(supabase, note);
  return { success: true, data: undefined };
}
