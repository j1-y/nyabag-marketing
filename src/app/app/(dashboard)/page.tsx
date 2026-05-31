import { createClient } from "@/lib/supabase/server";
import { BookmarkGrid } from "@/components/bookmarks/BookmarkGrid";
import type { Bookmark } from "@/lib/types";
import { getUserProfile } from "@/lib/profile";

export const dynamic = "force-dynamic";

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
  const profile = user ? await getUserProfile(supabase, user) : null;
  const initialBookmarks = (bookmarks ?? []) as Bookmark[];

  return (
    <BookmarkGrid
      initialBookmarks={initialBookmarks}
      userEmail={user?.email ?? ""}
      profileName={profile?.name ?? ""}
    />
  );
}
