import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { Bookmark, BookmarkAiMetadata } from "@/lib/types";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export async function getBookmarkAiMetadata(
  supabase: SupabaseClient,
  bookmarkId: string,
  userId: string
): Promise<BookmarkAiMetadata | null> {
  const { data, error } = await supabase
    .from("bookmark_ai_metadata")
    .select("*")
    .eq("bookmark_id", bookmarkId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[getBookmarkAiMetadata] Failed to load AI metadata:", error.message);
    return null;
  }

  return (data as BookmarkAiMetadata | null) ?? null;
}

export async function attachAiMetadataToBookmarks(
  supabase: SupabaseClient,
  bookmarks: Bookmark[],
  userId: string
): Promise<Bookmark[]> {
  const bookmarkIds = bookmarks.map((bookmark) => bookmark.id);
  if (bookmarkIds.length === 0) return bookmarks;

  const { data, error } = await supabase
    .from("bookmark_ai_metadata")
    .select("*")
    .eq("user_id", userId)
    .in("bookmark_id", bookmarkIds);

  if (error) {
    console.error("[attachAiMetadataToBookmarks] Failed to load AI metadata:", error.message);
    return bookmarks;
  }

  const byBookmarkId = new Map(
    ((data ?? []) as BookmarkAiMetadata[]).map((metadata) => [metadata.bookmark_id, metadata])
  );

  return bookmarks.map((bookmark) => ({
    ...bookmark,
    ai_metadata: byBookmarkId.get(bookmark.id) ?? null,
  }));
}
