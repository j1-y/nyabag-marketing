import { createClient } from "@/lib/supabase/server";
import type { CanvasNote, CanvasSection } from "@/lib/types";

export async function getNotes(): Promise<CanvasNote[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("canvas_notes")
    .select("*")
    .order("z_index", { ascending: true });

  if (error || !data) return [];
  const notes = data as CanvasNote[];

  return Promise.all(
    notes.map(async (note) => {
      if (note.media_source !== "upload" || !note.media_path) return note;

      const { data: signed } = await supabase.storage
        .from("canvas-media")
        .createSignedUrl(note.media_path, 60 * 60);

      return signed?.signedUrl ? { ...note, media_url: signed.signedUrl } : note;
    })
  );
}

export async function getSections(): Promise<CanvasSection[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("canvas_sections")
    .select("*")
    .order("z_index", { ascending: true });

  if (error || !data) return [];
  return data as CanvasSection[];
}
