"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";
import { getDesignData, getMicrolinkPreviewData } from "@/lib/data";
import { getDomain } from "@/lib/data";
import { mergeTags, scrapeBookmarkMetadata } from "@/lib/metadata";
import { PROFILE_AVATAR_BUCKET } from "@/lib/profile";
import { bookmarkCreateSchema, bookmarkUpdateSchema, profileUpdateSchema } from "@/lib/validations";
import type { ActionResult, Bookmark, UserProfile } from "@/lib/types";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const BOOKMARK_SCREENSHOT_BUCKET = "bookmark-screenshots";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type CachedScreenshot = {
  palette: string[] | null;
  screenshotUrl: string;
  screenshotPath: string;
  refreshedAt: string;
};

function avatarExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  return file.type.split("/")[1] || "png";
}

async function optimizeBookmarkScreenshot(bytes: ArrayBuffer) {
  const inputBuffer = Buffer.from(bytes);

  return sharp(inputBuffer, {
    animated: false,
    limitInputPixels: 120_000_000,
  })
    .rotate()
    .resize({
      width: 1600,
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
      effort: 5,
      smartSubsample: true,
      nearLossless: false,
    })
    .toBuffer();
}

async function cacheBookmarkScreenshot(
  supabase: Supabase,
  userId: string,
  bookmarkId: string,
  url: string
): Promise<CachedScreenshot | null> {
  const previewData = await getMicrolinkPreviewData(url);
  if (!previewData?.screenshotUrl) return null;

  const response = await fetch(previewData.screenshotUrl, { cache: "no-store" });
  if (!response.ok) return null;

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().startsWith("image/")) return null;

  const originalBytes = await response.arrayBuffer();

  let optimizedBytes: Buffer;
  try {
    optimizedBytes = await optimizeBookmarkScreenshot(originalBytes);
  } catch (error) {
    console.error("[cacheBookmarkScreenshot] Image optimization failed:", error);
    return null;
  }

  const screenshotPath = `${userId}/${bookmarkId}/screenshot-${Date.now()}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(BOOKMARK_SCREENSHOT_BUCKET)
    .upload(screenshotPath, optimizedBytes, {
      cacheControl: "31536000",
      contentType: "image/webp",
      upsert: true,
    });

  if (uploadError) return null;

  const screenshotUrl = supabase.storage
    .from(BOOKMARK_SCREENSHOT_BUCKET)
    .getPublicUrl(screenshotPath).data.publicUrl;

  return {
    palette: previewData.palette,
    screenshotUrl,
    screenshotPath,
    refreshedAt: previewData.refreshedAt,
  };
}

async function removeBookmarkScreenshot(supabase: Supabase, path: string | null | undefined) {
  if (path) await supabase.storage.from(BOOKMARK_SCREENSHOT_BUCKET).remove([path]);
}

// ── Create ────────────────────────────────────────────────────
export async function createBookmark(
  formData: FormData
): Promise<ActionResult<Bookmark>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = bookmarkCreateSchema.safeParse({
    url: formData.get("url"),
    title: formData.get("title") ?? undefined,
    tags: formData.get("tags") ?? "",
    note: formData.get("note") ?? undefined,
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { url, tags, note } = parsed.data;
  const domain = getDomain(url);
  const id = crypto.randomUUID();

  const [metadata, previewData] = await Promise.all([
    scrapeBookmarkMetadata(url),
    cacheBookmarkScreenshot(supabase, user.id, id, url),
  ]);

  const title =
    parsed.data.title?.trim() ||
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
      id,
      user_id: user.id,
      url,
      title,
      tags: finalTags,
      note: note ?? "",
      palette,
      fonts,
      screenshot_url: previewData?.screenshotUrl ?? null,
      screenshot_path: previewData?.screenshotPath ?? null,
      screenshot_refreshed_at: previewData?.refreshedAt ?? null,
      summary: metadata.summary,
      metadata_refreshed_at: metadata.refreshedAt,
    })
    .select()
    .single();

  if (error) {
    await removeBookmarkScreenshot(supabase, previewData?.screenshotPath);
    return { success: false, error: error.message };
  }

  revalidatePath("/app");
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

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("url, palette, fonts, screenshot_url, screenshot_path, screenshot_refreshed_at, summary, metadata_refreshed_at")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  const domain = getDomain(url);
  const urlChanged = !existing || existing.url !== url;

  const [metadata, previewData] = await Promise.all([
    urlChanged ? scrapeBookmarkMetadata(url) : Promise.resolve(null),
    urlChanged ? cacheBookmarkScreenshot(supabase, user.id, id, url) : Promise.resolve(null),
  ]);

  const title =
    parsed.data.title?.trim() ||
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
      screenshot_path: urlChanged ? previewData?.screenshotPath ?? null : existing?.screenshot_path ?? null,
      screenshot_refreshed_at: urlChanged
        ? previewData?.refreshedAt ?? null
        : existing?.screenshot_refreshed_at ?? null,
      summary: urlChanged ? metadata?.summary ?? "" : existing?.summary ?? "",
      metadata_refreshed_at: urlChanged
        ? metadata?.refreshedAt ?? null
        : existing?.metadata_refreshed_at ?? null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    await removeBookmarkScreenshot(supabase, previewData?.screenshotPath);
    return { success: false, error: error.message };
  }

  if (urlChanged && previewData?.screenshotPath && existing?.screenshot_path) {
    await removeBookmarkScreenshot(supabase, existing.screenshot_path);
  }

  revalidatePath("/app");
  return { success: true, data };
}

export async function refreshBookmarkScreenshot(id: string): Promise<ActionResult<Bookmark>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: existing, error: existingError } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (existingError || !existing) {
    return { success: false, error: "Bookmark not found" };
  }

  const cached = await cacheBookmarkScreenshot(supabase, user.id, id, existing.url);
  if (!cached) return { success: false, error: "Could not refresh screenshot" };

  const { data, error } = await supabase
    .from("bookmarks")
    .update({
      palette: cached.palette ?? existing.palette,
      screenshot_url: cached.screenshotUrl,
      screenshot_path: cached.screenshotPath,
      screenshot_refreshed_at: cached.refreshedAt,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    await removeBookmarkScreenshot(supabase, cached.screenshotPath);
    return { success: false, error: error.message };
  }

  await removeBookmarkScreenshot(supabase, existing.screenshot_path);

  revalidatePath("/app");
  revalidatePath(`/app/bookmarks/${id}`);

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

    const { data: bookmarkForCleanup } = await supabase
      .from("bookmarks")
      .select("screenshot_path")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

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
      const { data: exists } = await supabase
        .from("bookmarks")
        .select("id, user_id")
        .eq("id", id)
        .maybeSingle();

      if (exists) {
        console.warn(`[deleteBookmark] Bookmark ${id} exists but belongs to user ${exists.user_id} instead of ${user.id}`);
        return { success: false, error: "Permission denied: Bookmark belongs to another user" };
      }

      console.warn(`[deleteBookmark] Bookmark ${id} does not exist in the database`);
      return { success: false, error: "Bookmark not found" };
    }

    revalidatePath("/app");
    await removeBookmarkScreenshot(supabase, bookmarkForCleanup?.screenshot_path);

    return { success: true, data: undefined };
  } catch (err: unknown) {
    console.error("[deleteBookmark] Unexpected exception:", err);
    return { success: false, error: err instanceof Error ? err.message : "Internal server error" };
  }
}

// ── Auth ──────────────────────────────────────────────────────
export async function updateProfile(
  formData: FormData
): Promise<ActionResult<UserProfile>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const parsed = profileUpdateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();

  let avatarPath = existing?.avatar_path ?? null;
  const avatar = formData.get("avatar");

  if (avatar instanceof File && avatar.size > 0) {
    if (!AVATAR_TYPES.has(avatar.type)) {
      return { success: false, error: "Profile picture must be a JPG, PNG, WEBP, or GIF" };
    }

    if (avatar.size > MAX_AVATAR_BYTES) {
      return { success: false, error: "Profile picture must be 5MB or smaller" };
    }

    const nextPath = `${user.id}/avatar-${Date.now()}.${avatarExtension(avatar)}`;
    const { error: uploadError } = await supabase.storage
      .from(PROFILE_AVATAR_BUCKET)
      .upload(nextPath, avatar, {
        cacheControl: "3600",
        contentType: avatar.type,
        upsert: true,
      });

    if (uploadError) return { success: false, error: uploadError.message };

    if (avatarPath) {
      await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([avatarPath]);
    }

    avatarPath = nextPath;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert({
      user_id: user.id,
      name: parsed.data.name ?? "",
      email: parsed.data.email || user.email || "",
      phone: parsed.data.phone ?? "",
      avatar_path: avatarPath,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  const avatarUrl = avatarPath
    ? supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(avatarPath).data.publicUrl
    : null;

  revalidatePath("/app/profile");
  revalidatePath("/app");
  revalidatePath("/app/canvas");

  return {
    success: true,
    data: {
      ...(data as UserProfile),
      avatar_url: avatarUrl,
    },
  };
}

export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/app");
}
