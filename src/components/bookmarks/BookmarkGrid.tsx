"use client";

import { ShoppingBag, Plus } from "lucide-react";
import { BookmarksProvider, useBookmarks } from "@/hooks/useBookmarks";
import { BookmarkCard } from "./BookmarkCard";
import { PendingBookmarkCard } from "./PendingBookmarkCard";
import { AddBookmarkModal } from "./AddBookmarkModal";
import { EditBookmarkModal } from "./EditBookmarkModal";
import type { Bookmark } from "@/lib/types";
import { Topbar } from "../layout/Topbar";

function GridInner() {
  const { filtered, pendingBookmarks, openAdd } = useBookmarks();

  return (
    <>
      <Topbar />

      {/* Grid */}
      {filtered.length === 0 && pendingBookmarks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">
            <ShoppingBag size={24} strokeWidth={1.6} />
          </div>
          <h2>No bookmarks yet</h2>
          <p>Save websites, references, and ideas into a visual board.</p>
          <button className="btn-primary empty-state-action" onClick={openAdd}>
            <Plus size={15} /> Add bookmark
          </button>
        </div>
      ) : (
        <div className="bm-grid view-moodboard">
          {pendingBookmarks.map((bookmark) => (
            <PendingBookmarkCard key={bookmark.id} bookmark={bookmark} />
          ))}
          {filtered.map((b, i) => (
            <BookmarkCard key={b.id} bookmark={b} index={i} />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddBookmarkModal />
      <EditBookmarkModal />
    </>
  );
}

export function BookmarkGrid({ initialBookmarks }: { initialBookmarks: Bookmark[], userEmail: string }) {
  return (
    <BookmarksProvider initial={initialBookmarks}>
      <GridInner />
    </BookmarksProvider>
  );
}
