"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getDesignData, getMicrolinkPreviewData } from "@/lib/data";
import { getDomain } from "@/lib/data";
import { mergeTags, scrapeBookmarkMetadata } from "@/lib/metadata";
import { bookmarkCreateSchema, bookmarkUpdateSchema } from "@/lib/validations";
import type { ActionResult, Bookmark } from "@/lib/types";

// ── Create ────────────────────────────────────────────────────
export async function createBookmark(
  formData: FormData
): Promise<ActionResult<Bookmark>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = bookmarkCreateSchema.safeParse({
    url: formData.get("url"),
    title: formData.get("title"),
    tags: formData.get("tags") ?? "",
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { url, tags, note } = parsed.data;
  const domain = getDomain(url);

  const [metadata, previewData] = await Promise.all([
    scrapeBookmarkMetadata(url),
    getMicrolinkPreviewData(url),
  ]);
  const title =
    (parsed.data.title?.trim()) ||
    metadata.title ||
    domain.charAt(0).toUpperCase() + domain.slice(1) ||
    url;
  const finalTags = mergeTags(tags, metadata.tags);
  const designData = getDesignData(url);
  const palette = previewData?.palette ?? designData.palette;
  const { fonts } = designData;

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      user_id: user.id,
      url,
      title,
      tags: finalTags,
      note: note ?? "",
      palette,
      fonts,
      screenshot_url: previewData?.screenshotUrl ?? null,
      screenshot_refreshed_at: previewData?.refreshedAt ?? null,
      summary: metadata.summary,
      metadata_refreshed_at: metadata.refreshedAt,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true, data };
}

// ── Update ────────────────────────────────────────────────────
export async function updateBookmark(
  formData: FormData
): Promise<ActionResult<Bookmark>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = bookmarkUpdateSchema.safeParse({
    id: formData.get("id"),
    url: formData.get("url"),
    title: formData.get("title"),
    tags: formData.get("tags") ?? "",
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { id, url, tags, note } = parsed.data;
  // Fetch current bookmark to check if URL changed (re-fetch design data only if so)
  const { data: existing } = await supabase
    .from("bookmarks")
    .select("url, palette, fonts, screenshot_url, screenshot_refreshed_at, summary, metadata_refreshed_at")
    .eq("id", id)
    .single();

  const domain = getDomain(url);
  const urlChanged = !existing || existing.url !== url;
  const [metadata, previewData] = await Promise.all([
    urlChanged ? scrapeBookmarkMetadata(url) : Promise.resolve(null),
    urlChanged ? getMicrolinkPreviewData(url) : Promise.resolve(null),
  ]);
  const title =
    (parsed.data.title?.trim()) ||
    metadata?.title ||
    domain.charAt(0).toUpperCase() + domain.slice(1) ||
    url;
  const finalTags = mergeTags(tags, metadata?.tags ?? []);
  const designData = getDesignData(url);
  const { palette, fonts } =
    existing && !urlChanged
      ? {
          palette: existing.palette ?? designData.palette,
          fonts: existing.fonts ?? designData.fonts,
        }
      : {
          palette: previewData?.palette ?? designData.palette,
          fonts: designData.fonts,
        };

  const { data, error } = await supabase
    .from("bookmarks")
    .update({
      url,
      title,
      tags: finalTags,
      note: note ?? "",
      palette,
      fonts,
      screenshot_url: urlChanged ? previewData?.screenshotUrl ?? null : existing?.screenshot_url ?? null,
      screenshot_refreshed_at: urlChanged
        ? previewData?.refreshedAt ?? null
        : existing?.screenshot_refreshed_at ?? null,
      summary: urlChanged ? metadata?.summary ?? "" : existing?.summary ?? "",
      metadata_refreshed_at: urlChanged
        ? metadata?.refreshedAt ?? null
        : existing?.metadata_refreshed_at ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id) // RLS enforced here too
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/");
  return { success: true, data };
}

// ── Delete ────────────────────────────────────────────────────
export async function deleteBookmark(id: string): Promise<ActionResult> {
  console.log(`[deleteBookmark] Triggered for id: ${id}`);
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error("[deleteBookmark] Auth error:", authError);
      return { success: false, error: authError.message };
    }
    if (!user) {
      console.warn("[deleteBookmark] No user found in session");
      return { success: false, error: "Not authenticated" };
    }

    console.log(`[deleteBookmark] Authenticated user: ${user.email} (${user.id})`);

    const { error, count } = await supabase
      .from("bookmarks")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("[deleteBookmark] Supabase delete error:", error);
      return { success: false, error: error.message };
    }

    console.log(`[deleteBookmark] Delete completed. Affected rows: ${count}`);

    if (count === 0) {
      // Check if the bookmark exists but belongs to someone else
      const { data: exists } = await supabase
        .from("bookmarks")
        .select("id, user_id")
        .eq("id", id)
        .maybeSingle();
      
      if (exists) {
        console.warn(`[deleteBookmark] Bookmark ${id} exists but belongs to user ${exists.user_id} instead of ${user.id}`);
        return { success: false, error: "Permission denied: Bookmark belongs to another user" };
      } else {
        console.warn(`[deleteBookmark] Bookmark ${id} does not exist in the database`);
        return { success: false, error: "Bookmark not found" };
      }
    }

    revalidatePath("/");
    return { success: true, data: undefined };
  } catch (err: unknown) {
    console.error("[deleteBookmark] Unexpected exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error" };
  }
}

// ── Auth ──────────────────────────────────────────────────────
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/");
}
