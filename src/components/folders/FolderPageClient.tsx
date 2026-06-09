"use client";

import { useMemo, useState } from "react";
import { ListIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { BookmarksProvider, useBookmarks } from "@/hooks/useBookmarks";
import { AddBookmarkModal } from "@/components/bookmarks/AddBookmarkModal";
import { EditBookmarkModal } from "@/components/bookmarks/EditBookmarkModal";
import { DeleteBookmarkDialog } from "@/components/bookmarks/DeleteBookmarkDialog";
import { BookmarkCard } from "@/components/bookmarks/BookmarkCard";
import { FolderBreadcrumbs } from "@/components/folders/FolderBreadcrumbs";
import { FolderCard } from "@/components/folders/FolderCard";
import { FolderDetailHeader } from "@/components/folders/FolderDetailHeader";
import { FolderEmptyState } from "@/components/folders/FolderEmptyState";
import { FolderBookmarkRow } from "@/components/folders/FolderBookmarkRow";
import type { Bookmark, BookmarkFolder } from "@/lib/types";

type SortKey = "date" | "title" | "domain";
type ViewMode = "list" | "grid";

type Props = {
  initialBookmarks: Bookmark[];
  currentFolder: BookmarkFolder | null;
  subfolders: BookmarkFolder[];
  breadcrumbs: BookmarkFolder[];
  isUncategorized: boolean;
  allFolders: BookmarkFolder[];
};

/** Public entry point — wraps everything in BookmarksProvider */
export function FolderPageClient(props: Props) {
  return (
    <BookmarksProvider initial={props.initialBookmarks}>
      <FolderPageInner {...props} />
    </BookmarksProvider>
  );
}

/** Inner component — can call useBookmarks() */
function FolderPageInner({
  currentFolder,
  subfolders,
  breadcrumbs,
  isUncategorized,
  allFolders,
}: Props) {
  const { filtered, openAdd, openEdit, deleteItem } = useBookmarks();
  const [sort, setSort] = useState<SortKey>("date");
  const [view, setView] = useState<ViewMode>("list");

  // Shared delete dialog state — avoids per-row Radix Portal breaking flex layout
  const [pendingDelete, setPendingDelete] = useState<Bookmark | null>(null);

  const sortedBookmarks = useMemo<Bookmark[]>(() => {
    const arr = [...filtered];
    switch (sort) {
      case "title":
        arr.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "domain": {
        const host = (url: string) => {
          try {
            return new URL(url).hostname.replace(/^www\./, "");
          } catch {
            return url;
          }
        };
        arr.sort((a, b) => host(a.url).localeCompare(host(b.url)));
        break;
      }
      default:
        arr.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
    }
    return arr;
  }, [filtered, sort]);

  const isEmpty = subfolders.length === 0 && filtered.length === 0;

  return (
    <div className="folder-detail-page">
      {/* Breadcrumbs */}
      <FolderBreadcrumbs
        breadcrumbs={breadcrumbs}
        isUncategorized={isUncategorized}
      />

      {/* Page header */}
      <FolderDetailHeader
        folder={currentFolder}
        isUncategorized={isUncategorized}
        bookmarkCount={filtered.length}
        subfolderCount={subfolders.length}
        allFolders={allFolders}
        onAddBookmark={openAdd}
      />

      {isEmpty ? (
        <FolderEmptyState isUncategorized={isUncategorized} />
      ) : (
        <>
          {/* Subfolders grid */}
          {subfolders.length > 0 && (
            <section className="folder-section">
              <h2 className="folder-section-title">Subfolders</h2>
              <div className="folder-card-grid">
                {subfolders.map((sf) => (
                  <FolderCard key={sf.id} folder={sf} />
                ))}
              </div>
            </section>
          )}

          {/* Bookmarks */}
          {filtered.length > 0 && (
            <section className="folder-section">
              {subfolders.length > 0 && (
                <h2 className="folder-section-title">Bookmarks in this folder</h2>
              )}

              {/* Toolbar */}
              <div className="folder-toolbar">
                <div className="folder-toolbar-left">
                  <label htmlFor="folder-sort" className="folder-toolbar-label">
                    Sort
                  </label>
                  <select
                    id="folder-sort"
                    className="folder-sort-select"
                    value={sort}
                    onChange={(e) => setSort(e.target.value as SortKey)}
                    aria-label="Sort bookmarks"
                  >
                    <option value="date">Date saved</option>
                    <option value="title">Title A–Z</option>
                    <option value="domain">Domain</option>
                  </select>
                </div>
                <div
                  className="folder-view-toggle"
                  role="group"
                  aria-label="View mode"
                >
                  <button
                    type="button"
                    className={`folder-view-btn${view === "list" ? " active" : ""}`}
                    onClick={() => setView("list")}
                    aria-pressed={view === "list"}
                    title="List view"
                  >
                    <ListIcon size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className={`folder-view-btn${view === "grid" ? " active" : ""}`}
                    onClick={() => setView("grid")}
                    aria-pressed={view === "grid"}
                    title="Moodboard view"
                  >
                    <SquaresFourIcon size={14} aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* List view */}
              {view === "list" && (
                <div className="folder-bm-list">
                  {sortedBookmarks.map((bm) => (
                    <FolderBookmarkRow
                      key={bm.id}
                      bookmark={bm}
                      onEdit={openEdit}
                      onDelete={setPendingDelete}
                    />
                  ))}
                </div>
              )}

              {/* Moodboard / grid view */}
              {view === "grid" && (
                <div className="bm-grid view-moodboard">
                  {sortedBookmarks.map((bm, i) => (
                    <BookmarkCard
                      key={bm.id}
                      bookmark={bm}
                      index={i}
                      onEdit={openEdit}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* Modals — all rendered at top level, inside BookmarksProvider */}
      <AddBookmarkModal />
      <EditBookmarkModal />

      {/* One shared delete dialog — avoids per-row Portal causing layout issues */}
      <DeleteBookmarkDialog
        title={pendingDelete?.title ?? ""}
        open={pendingDelete !== null}
        onOpenChange={(open) => { if (!open) setPendingDelete(null); }}
        onConfirm={() => {
          if (pendingDelete) {
            deleteItem(pendingDelete.id);
            setPendingDelete(null);
          }
        }}
      />
    </div>
  );
}
