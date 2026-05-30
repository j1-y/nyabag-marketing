"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  NoteIcon,
  PaletteIcon,
  PencilSimpleIcon,
  TagIcon,
  TextTIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { deleteBookmark } from "@/lib/actions";
import { getDomain } from "@/lib/data";
import type { Bookmark } from "@/lib/types";
import { BookmarksProvider, useBookmarks } from "@/hooks/useBookmarks";
import { Button } from "@/components/ui/button";
import { DeleteBookmarkDialog } from "./DeleteBookmarkDialog";
import { EditBookmarkModal } from "./EditBookmarkModal";
import { BookmarkColorPalette } from "./BookmarkColorPalette";

function BookmarkDetailInner({ bookmark }: { bookmark: Bookmark }) {
  const router = useRouter();
  const { openEdit } = useBookmarks();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const domain = getDomain(bookmark.url);
  const savedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(bookmark.created_at));

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteBookmark(bookmark.id);
      if (result.success) router.push("/");
      else console.error("Failed to delete bookmark:", result.error);
    });
  }

  return (
    <div className="bookmark-detail-page">
      <main className="bookmark-detail-shell">
        <section className="bookmark-detail-info">
          <button className="detail-back" onClick={() => router.push("/")}>
            <ArrowLeftIcon size={15} />
            Back to bookmarks
          </button>

          <div>
            <p className="detail-domain">{domain}</p>
            <h1>{bookmark.title}</h1>
          </div>

          {bookmark.summary && (
            <div className="detail-summary-card">
              <p>{bookmark.summary}</p>
            </div>
          )}

          {bookmark.note && (
            <div className="detail-note-card">
              <NoteIcon size={15} />
              <p>{bookmark.note}</p>
            </div>
          )}

          <a className="detail-visit" href={bookmark.url} target="_blank" rel="noopener noreferrer">
            Visit website
            <ArrowSquareOutIcon size={14} />
          </a>

          <div className="detail-table">
            <div>
              <span>Domain</span>
              <strong>{domain}</strong>
            </div>
            <div>
              <span>Saved</span>
              <strong>{savedDate}</strong>
            </div>
            <div>
              <span>Tags</span>
              <strong>{bookmark.tags.length ? bookmark.tags.join(", ") : "No tags"}</strong>
            </div>
          </div>

          <div className="detail-section">
            <h2><PaletteIcon size={15} /> Extracted colors</h2>
            <BookmarkColorPalette colors={bookmark.palette} />
          </div>

          <div className="detail-section">
            <h2><TextTIcon size={15} /> Detected fonts</h2>
            <div className="detail-chip-list">
              {bookmark.fonts.map((font) => <span key={font}>{font}</span>)}
            </div>
          </div>

          <div className="detail-section">
            <h2><TagIcon size={15} /> Tags</h2>
            <div className="detail-chip-list">
              {bookmark.tags.length
                ? bookmark.tags.map((tag) => <span key={tag}>{tag}</span>)
                : <span>No tags</span>}
            </div>
          </div>

          <div className="detail-actions">
            <Button variant="destructive" onClick={() => setDeleteOpen(true)} disabled={isPending}>
              <TrashIcon /> Delete
            </Button>
            <Button variant="outline" onClick={() => openEdit(bookmark)}>
              <PencilSimpleIcon /> Edit
            </Button>
            <Button asChild>
              <a href={bookmark.url} target="_blank" rel="noopener noreferrer">
                <ArrowSquareOutIcon /> Visit site
              </a>
            </Button>
          </div>
        </section>

        <section className="bookmark-detail-preview" aria-label={`${bookmark.title} screenshot`}>
          <div className="browser-frame">
            <div className="browser-topbar">
              <span />
              <span />
              <span />
              <strong>{domain}</strong>
              <a href={bookmark.url} target="_blank" rel="noopener noreferrer" aria-label="Open site">
                <ArrowSquareOutIcon size={14} />
              </a>
            </div>
            <div className="browser-shot">
              {bookmark.screenshot_url ? (
                <img src={bookmark.screenshot_url} alt={`${bookmark.title} full page screenshot`} />
              ) : (
                <div className="preview-fallback">
                  <span>No screenshot yet</span>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <EditBookmarkModal />
      <DeleteBookmarkDialog
        title={bookmark.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDelete}
      />
    </div>
  );
}

export function BookmarkDetailPage({ bookmark }: { bookmark: Bookmark }) {
  return (
    <BookmarksProvider initial={[bookmark]}>
      <BookmarkDetailInner bookmark={bookmark} />
    </BookmarksProvider>
  );
}
