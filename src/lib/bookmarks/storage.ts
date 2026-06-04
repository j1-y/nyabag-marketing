import "server-only";

import type { createClient } from "@/lib/supabase/server";

export const BOOKMARK_SCREENSHOT_BUCKET = "bookmark-screenshots";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export async function removeBookmarkScreenshot(supabase: Supabase, path: string | null | undefined) {
  if (path) await supabase.storage.from(BOOKMARK_SCREENSHOT_BUCKET).remove([path]);
}
