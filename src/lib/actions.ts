"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getDesignData } from "@/lib/data";
import { getDomain } from "@/lib/data";
import { mergeTags, scrapeBookmarkMetadata } from "@/lib/metadata";
import {
  cacheBookmarkScreenshot,
  enrichBookmark,
  removeBookmarkScreenshot,
} from "@/lib/bookmarks/enrichment";
import { timeAsync } from "@/lib/perf";
import { PROFILE_AVATAR_BUCKET } from "@/lib/profile";
import { bookmarkCreateSchema, bookmarkUpdateSchema, profileUpdateSchema } from "@/lib/validations";
import { extractUrlsFromText } from "@/lib/url-extraction";
import type { ActionResult, Bookmark, ImportBookmarksResult, UserProfile } from "@/lib/types";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const IMPORT_BOOKMARK_DELAY_MS = 900;

type Supabase = Awaited<ReturnType<typeof createClient>>;

type CreateBookmarkForUserInput = {
  supabase: Supabase;
  userId: string;
  url: string;
  title?: string;
  tags?: string[];
  note?: string;
  paceScreenshot?: boolean;
};

function avatarExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;
  return file.type.split("/")[1] || "png";
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createBookmarkForUser({
  supabase,
  userId,
  url,
  title,
  tags = [],
  note,
  paceScreenshot,
}: CreateBookmarkForUserInput): Promise<ActionResult<Bookmark>> {
  const domain = getDomain(url);
  const id = crypto.randomUUID();
  const designData = getDesignData(url);

  if (!paceScreenshot) {
    const fallbackTitle =
      title?.trim() ||
      domain.charAt(0).toUpperCase() + domain.slice(1) ||
      url;

    const { data, error } = await supabase
      .from("bookmarks")
      .insert({
        id,
        user_id: userId,
        url,
        title: fallbackTitle,
        tags,
        note: note ?? "",
        palette: designData.palette,
        fonts: designData.fonts,
        screenshot_url: null,
        screenshot_path: null,
        screenshot_refreshed_at: null,
        summary: "",
        metadata_refreshed_at: null,
        processing_status: "processing",
        processing_error: null,
        enrichment_started_at: new Date().toISOString(),
        enrichment_finished_at: null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    // Async enrichment keeps direct user interactions away from Microlink, Sharp, and storage latency.
    after(() => enrichBookmark(id, userId, url, title, tags));
    return { success: true, data };
  }

  const [metadata, previewData] = paceScreenshot
    ? [
        await scrapeBookmarkMetadata(url),
        await cacheBookmarkScreenshot(supabase, userId, id, url),
      ]
    : await Promise.all([
        scrapeBookmarkMetadata(url),
        cacheBookmarkScreenshot(supabase, userId, id, url),
      ]);

  if (paceScreenshot) {
    await wait(IMPORT_BOOKMARK_DELAY_MS);
  }

  const finalTitle =
    title?.trim() ||
    metadata.title ||
    domain.charAt(0).toUpperCase() + domain.slice(1) ||
    url;

  const finalTags = mergeTags(tags, metadata.tags);
  const palette = previewData?.palette ?? designData.palette;
  const { fonts } = designData;

  const { data, error } = await supabase
    .from("bookmarks")
    .insert({
      id,
      user_id: userId,
      url,
      title: finalTitle,
      tags: finalTags,
      note: note ?? "",
      palette,
      fonts,
      screenshot_url: previewData?.screenshotUrl ?? null,
      screenshot_path: previewData?.screenshotPath ?? null,
      screenshot_refreshed_at: previewData?.refreshedAt ?? null,
      summary: metadata.summary,
      metadata_refreshed_at: metadata.refreshedAt,
      processing_status: "ready",
      processing_error: null,
      enrichment_started_at: new Date().toISOString(),
      enrichment_finished_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    await removeBookmarkScreenshot(supabase, previewData?.screenshotPath);
    return { success: false, error: error.message };
  }

  return { success: true, data };
}

// ── Create ────────────────────────────────────────────────────
export async function createBookmark(
  formData: FormData
): Promise<ActionResult<Bookmark>> {
  return timeAsync("createBookmark", async () => {
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

    const result = await createBookmarkForUser({
      supabase,
      userId: user.id,
      url: parsed.data.url,
      title: parsed.data.title,
      tags: parsed.data.tags,
      note: parsed.data.note,
    });

    if (!result.success) return result;
    revalidatePath("/app");
    return result;
  });
}

export async function importBookmarks(
  formData: FormData
): Promise<ActionResult<ImportBookmarksResult>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const rawUrls = formData.get("urls");
  const rawText = String(formData.get("text") ?? "");
  let sourceText = rawText;

  if (typeof rawUrls === "string" && rawUrls.trim()) {
    try {
      const parsedUrls = JSON.parse(rawUrls);
      if (Array.isArray(parsedUrls)) {
        sourceText = parsedUrls.filter((value) => typeof value === "string").join("\n");
      }
    } catch {
      return { success: false, error: "Could not read imported URLs" };
    }
  }

  const urls = extractUrlsFromText(sourceText);
  if (urls.length === 0) {
    return { success: false, error: "Paste or drop text containing URLs to begin." };
  }

  const result: ImportBookmarksResult = {
    created: [],
    failed: [],
    skipped: [],
    total: urls.length,
  };

  for (const rawUrl of urls) {
    const parsed = bookmarkCreateSchema.safeParse({
      url: rawUrl,
      title: undefined,
      tags: "",
      note: undefined,
    });

    if (!parsed.success) {
      result.failed.push({
        url: rawUrl,
        success: false,
        error: parsed.error.issues[0].message,
      });
      continue;
    }

    const normalizedUrl = parsed.data.url;
    const { data: duplicate, error: duplicateError } = await supabase
      .from("bookmarks")
      .select("id")
      .eq("user_id", user.id)
      .eq("url", normalizedUrl)
      .maybeSingle();

    if (duplicateError) {
      result.failed.push({
        url: normalizedUrl,
        success: false,
        error: duplicateError.message,
      });
      continue;
    }

    if (duplicate) {
      result.skipped.push({
        url: normalizedUrl,
        success: false,
        error: "Already saved",
      });
      continue;
    }

    const created = await createBookmarkForUser({
      supabase,
      userId: user.id,
      url: normalizedUrl,
      tags: [],
      paceScreenshot: true,
    });

    if (created.success) {
      result.created.push(created.data);
    } else {
      result.failed.push({
        url: normalizedUrl,
        success: false,
        error: created.error,
      });
    }
  }

  if (result.created.length > 0) {
    revalidatePath("/app");
  }

  return { success: true, data: result };
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
export async function getProcessingBookmarks(): Promise<ActionResult<Bookmark[]>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as Bookmark[] };
}

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
