import { createClient } from "@/lib/supabase/server";
import { BookmarkGrid } from "@/components/bookmarks/BookmarkGrid";
import type { Bookmark } from "@/lib/types";
import { getMicrolinkPreviewData, isScreenshotStale } from "@/lib/data";
import { mergeTags, scrapeBookmarkMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

const MAX_SCREENSHOT_REFRESHES_PER_LOAD = 6;
const MAX_METADATA_REFRESHES_PER_LOAD = 4;

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: bookmarks, error } = await supabase
    .from("bookmarks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return (
      <div className="empty-state">
        <p>Failed to load bookmarks. Please refresh.</p>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  const initialBookmarks = (bookmarks ?? []) as Bookmark[];
  const refreshedBookmarks = new Map<string, Bookmark>();

  const dueForRefresh = initialBookmarks
    .filter((bookmark) => !bookmark.screenshot_url || isScreenshotStale(bookmark.screenshot_refreshed_at))
    .slice(0, MAX_SCREENSHOT_REFRESHES_PER_LOAD);

  for (const bookmark of dueForRefresh) {
    const previewData = await getMicrolinkPreviewData(bookmark.url);
    if (!previewData) continue;

    const refreshedBookmark = {
      ...bookmark,
      palette: previewData.palette ?? bookmark.palette,
      screenshot_url: previewData.screenshotUrl ?? bookmark.screenshot_url,
      screenshot_refreshed_at: previewData.refreshedAt,
    };

    await supabase
      .from("bookmarks")
      .update({
        palette: refreshedBookmark.palette,
        screenshot_url: refreshedBookmark.screenshot_url,
        screenshot_refreshed_at: refreshedBookmark.screenshot_refreshed_at,
      })
      .eq("id", bookmark.id);

    refreshedBookmarks.set(bookmark.id, refreshedBookmark);
  }

  const metadataBackfill = initialBookmarks
    .filter((bookmark) => !bookmark.summary && !bookmark.metadata_refreshed_at)
    .slice(0, MAX_METADATA_REFRESHES_PER_LOAD);

  for (const bookmark of metadataBackfill) {
    const metadata = await scrapeBookmarkMetadata(bookmark.url);
    if (!metadata.refreshedAt) continue;

    const current = refreshedBookmarks.get(bookmark.id) ?? bookmark;
    const refreshedBookmark = {
      ...current,
      summary: metadata.summary,
      tags: mergeTags(current.tags, metadata.tags),
      metadata_refreshed_at: metadata.refreshedAt,
    };

    await supabase
      .from("bookmarks")
      .update({
        summary: refreshedBookmark.summary,
        tags: refreshedBookmark.tags,
        metadata_refreshed_at: refreshedBookmark.metadata_refreshed_at,
      })
      .eq("id", bookmark.id);

    refreshedBookmarks.set(bookmark.id, refreshedBookmark);
  }

  const visibleBookmarks = initialBookmarks.map(
    (bookmark) => refreshedBookmarks.get(bookmark.id) ?? bookmark
  );

  return <BookmarkGrid initialBookmarks={visibleBookmarks} userEmail={user?.email ?? ""} />;
}
