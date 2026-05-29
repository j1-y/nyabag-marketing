import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BookmarkDetailPage } from "@/components/bookmarks/BookmarkDetailPage";
import type { Bookmark } from "@/lib/types";
import { getScreenshotPalette } from "@/lib/data";

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
  const palette = await getScreenshotPalette(bookmark.url);

  return <BookmarkDetailPage bookmark={{ ...bookmark, palette: palette ?? bookmark.palette }} />;
}
