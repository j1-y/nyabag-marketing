"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOutIcon,
  FolderSimpleIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { getDomain, getFaviconUrl } from "@/lib/data";
import { getBookmarkFolders } from "@/lib/folder-actions";
import { MoveToFolderMenu } from "@/components/folders/MoveToFolderMenu";
import type { Bookmark, BookmarkFolder } from "@/lib/types";

type Props = {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
};

export function FolderBookmarkRow({ bookmark, onEdit, onDelete }: Props) {
  const router = useRouter();
  const [faviconError, setFaviconError] = useState(false);
  const [moveFolderOpen, setMoveFolderOpen] = useState(false);
  const [folders, setFolders] = useState<BookmarkFolder[]>([]);
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [, startFolderTransition] = useTransition();
  const moveRef = useRef<HTMLDivElement>(null);

  const domain = getDomain(bookmark.url);
  const favicon = getFaviconUrl(bookmark.url);
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(bookmark.created_at));

  function handleMoveClick(e: React.MouseEvent) {
    e.stopPropagation();
    setMoveFolderOpen((v) => !v);
    if (!foldersLoaded) {
      startFolderTransition(async () => {
        const result = await getBookmarkFolders();
        if (result.success) setFolders(result.data);
        setFoldersLoaded(true);
      });
    }
  }

  useEffect(() => {
    if (!moveFolderOpen) return;
    function onPointerDown(e: PointerEvent) {
      if (!moveRef.current?.contains(e.target as Node)) {
        setMoveFolderOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [moveFolderOpen]);

  return (
    <div
      className="folder-bm-row"
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/app/bookmarks/${bookmark.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/app/bookmarks/${bookmark.id}`);
      }}
      aria-label={`Open ${bookmark.title}`}
    >
      {/* Favicon */}
      <div className="folder-bm-favicon" aria-hidden="true">
        {favicon && !faviconError ? (
          <img
            src={favicon}
            alt=""
            width={14}
            height={14}
            style={{ borderRadius: 3, display: "block" }}
            onError={() => setFaviconError(true)}
          />
        ) : (
          <span className="folder-bm-favicon-fallback">
            {domain.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Title + domain */}
      <div className="folder-bm-info">
        <span className="folder-bm-title">{bookmark.title}</span>
        <span className="folder-bm-domain">{domain}</span>
      </div>

      {/* Tags (max 3) */}
      {bookmark.tags.length > 0 && (
        <div className="folder-bm-tags" aria-label="Tags">
          {bookmark.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="folder-bm-tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Date */}
      <time className="folder-bm-date" dateTime={bookmark.created_at}>
        {formattedDate}
      </time>

      {/* Hover actions — stop propagation so row click doesn't fire */}
      <div
        className="folder-bm-actions"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="folder-bm-action-btn"
          title="Open link"
          aria-label={`Open ${bookmark.title}`}
          onClick={() =>
            window.open(bookmark.url, "_blank", "noopener,noreferrer")
          }
        >
          <ArrowSquareOutIcon size={13} />
        </button>
        <button
          type="button"
          className="folder-bm-action-btn"
          title="Edit"
          aria-label="Edit bookmark"
          onClick={() => onEdit(bookmark)}
        >
          <PencilSimpleIcon size={13} />
        </button>
        <div ref={moveRef} className="folder-bm-move-wrap">
          <button
            type="button"
            className="folder-bm-action-btn"
            title="Move to folder"
            aria-label="Move to folder"
            aria-haspopup="menu"
            aria-expanded={moveFolderOpen}
            onClick={handleMoveClick}
          >
            <FolderSimpleIcon size={13} />
          </button>
          {moveFolderOpen && (
            <MoveToFolderMenu
              bookmarkId={bookmark.id}
              currentFolderId={bookmark.folder_id}
              folders={folders}
              onMoved={() => {
                setMoveFolderOpen(false);
                router.refresh();
              }}
            />
          )}
        </div>
        <button
          type="button"
          className="folder-bm-action-btn folder-bm-action-btn-danger"
          title="Delete"
          aria-label="Delete bookmark"
          onClick={() => onDelete(bookmark)}
        >
          <TrashIcon size={13} />
        </button>
      </div>
    </div>
  );
}
