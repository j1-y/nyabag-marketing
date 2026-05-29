import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookmarkDetailPage } from "@/components/bookmarks/BookmarkDetailPage";
import type { Bookmark } from "@/lib/types";
import { getMicrolinkPreviewData, isScreenshotStale } from "@/lib/data";
import { mergeTags, scrapeBookmarkMetadata } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export default async function BookmarkPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  const bookmark = data as Bookmark;
  let visibleBookmark = bookmark;

  if (!visibleBookmark.summary && !visibleBookmark.metadata_refreshed_at) {
    const metadata = await scrapeBookmarkMetadata(visibleBookmark.url);

    if (metadata.refreshedAt) {
      visibleBookmark = {
        ...visibleBookmark,
        summary: metadata.summary,
        tags: mergeTags(visibleBookmark.tags, metadata.tags),
        metadata_refreshed_at: metadata.refreshedAt,
      };

      await supabase
        .from("bookmarks")
        .update({
          summary: visibleBookmark.summary,
          tags: visibleBookmark.tags,
          metadata_refreshed_at: visibleBookmark.metadata_refreshed_at,
        })
        .eq("id", visibleBookmark.id);
    }
  }

  if (!visibleBookmark.screenshot_url || isScreenshotStale(visibleBookmark.screenshot_refreshed_at)) {
    const previewData = await getMicrolinkPreviewData(visibleBookmark.url);

    if (previewData) {
      const refreshedBookmark = {
        ...visibleBookmark,
        palette: previewData.palette ?? visibleBookmark.palette,
        screenshot_url: previewData.screenshotUrl ?? visibleBookmark.screenshot_url,
        screenshot_refreshed_at: previewData.refreshedAt,
      };

      await supabase
        .from("bookmarks")
        .update({
          palette: refreshedBookmark.palette,
          screenshot_url: refreshedBookmark.screenshot_url,
          screenshot_refreshed_at: refreshedBookmark.screenshot_refreshed_at,
        })
        .eq("id", visibleBookmark.id);

      return <BookmarkDetailPage bookmark={refreshedBookmark} />;
    }
  }

  return <BookmarkDetailPage bookmark={visibleBookmark} />;
}
