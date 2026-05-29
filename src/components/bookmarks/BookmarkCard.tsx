"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Trash2, Image as ImageIcon } from "lucide-react";
import { getDomain, getFaviconUrl, getScreenshotUrl } from "@/lib/data";
import { useBookmarks } from "@/hooks/useBookmarks";
import type { Bookmark } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { DeleteBookmarkDialog } from "./DeleteBookmarkDialog";

export function BookmarkCard({
  bookmark,
  index,
}: {
  bookmark: Bookmark;
  index: number;
}) {
  const router = useRouter();
  const { openEdit, deleteItem } = useBookmarks();
  const [imgError, setImgError] = useState(false);
  const [faviconError, setFaviconError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const domain = getDomain(bookmark.url);
  const favicon = getFaviconUrl(bookmark.url);
  const screenshot = getScreenshotUrl(bookmark.url);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteOpen(true);
  }

  return (
    <>
      <article
        className="bm-card moodboard-card"
        style={{ animationDelay: `${index * 0.04}s` }}
        onClick={() => router.push(`/bookmarks/${bookmark.id}`)}
        aria-label={bookmark.title}
      >
        <div className="moodboard-shot">
          <div className="moodboard-shot-scroll">
            {!imgError ? (
              <img
                className="moodboard-img"
                src={screenshot}
                alt={`${bookmark.title} preview`}
                loading="lazy"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="preview-fallback">
                <ImageIcon />
                <span>{domain}</span>
              </div>
            )}
          </div>

          <div className="moodboard-overlay">
            <div className="moodboard-meta">
              {favicon && !faviconError ? (
                <img
                  src={favicon}
                  alt=""
                  loading="lazy"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <span className="moodboard-favicon-fallback">
                  {domain.charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <h3>{bookmark.title}</h3>
                <p>{domain}</p>
              </div>
            </div>
            <div className="moodboard-actions">
              <Button
                variant="ghost" size="icon" className="moodboard-action"
                title="Open site"
                aria-label={`Open ${bookmark.title}`}
                onClick={(e) => { e.stopPropagation(); window.open(bookmark.url, "_blank", "noopener,noreferrer"); }}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="moodboard-action"
                title="Edit"
                aria-label={`Edit ${bookmark.title}`}
                onClick={(e) => { e.stopPropagation(); openEdit(bookmark); }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="moodboard-action moodboard-action-danger"
                title="Delete"
                aria-label={`Delete ${bookmark.title}`}
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </article>
      <DeleteBookmarkDialog
        title={bookmark.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => deleteItem(bookmark.id)}
      />
    </>
  );
}
