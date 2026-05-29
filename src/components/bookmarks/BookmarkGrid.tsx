"use client";

import { ShoppingBag, Plus } from "lucide-react";
import { BookmarksProvider, useBookmarks } from "@/hooks/useBookmarks";
import { BookmarkCard } from "./BookmarkCard";
import { PendingBookmarkCard } from "./PendingBookmarkCard";
import { AddBookmarkModal } from "./AddBookmarkModal";
import { EditBookmarkModal } from "./EditBookmarkModal";
import type { Bookmark } from "@/lib/types";
import { Topbar } from "../layout/Topbar";
import { FeatureSwitch } from "../layout/FeatureSwitch";

function GridInner() {
  const { filtered, activeTag, setActiveTag, bookmarks, pendingBookmarks, openAdd } =
    useBookmarks();

  const tags = ["All", ...Array.from(new Set(bookmarks.flatMap((b) => b.tags)))];

  return (
    <>
      {/* Tag strip */}
      <div className="tag-strip">
        {tags.map((t) => (
          <button
            key={t}
            className={`tag-chip ${activeTag === t ? "active" : ""}`}
            onClick={() => setActiveTag(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Grid */}
      {filtered.length === 0 && pendingBookmarks.length === 0 ? (
        <div className="empty-state">
          <ShoppingBag size={42} strokeWidth={1.2} />
          <h2>No bookmarks yet</h2>
          <p>Save your first site to get started.</p>
          <button className="btn-primary" onClick={openAdd}>
            <Plus size={14} /> Add bookmark
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

export function BookmarkGrid({ initialBookmarks, userEmail }: { initialBookmarks: Bookmark[], userEmail: string }) {
  return (
    <BookmarksProvider initial={initialBookmarks}>
      <div className="app-layout no-sidebar">
        <FeatureSwitch />
        <div className="main-content">
          <Topbar userEmail={userEmail} />
          <GridInner />
        </div>
      </div>
    </BookmarksProvider>
  );
}
