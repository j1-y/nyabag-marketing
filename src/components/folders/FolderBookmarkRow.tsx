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

function getInitials(str: string) {
  return str
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_COLORS = [
  "#7c6af7", "#f97316", "#10b981", "#3b82f6",
  "#e11d48", "#8b5cf6", "#06b6d4", "#f59e0b",
];
function avatarColor(str: string) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

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

  const initials = getInitials(domain);
  const bg = avatarColor(domain);

  return (
    <div
      className="folder-table-row"
      role="button"
      tabIndex={0}
      onClick={() => router.push(`/app/bookmarks/${bookmark.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter") router.push(`/app/bookmarks/${bookmark.id}`);
      }}
      aria-label={`Open ${bookmark.title}`}
    >
      <div className="folder-table-td-check">
        <div className="folder-ui-checkbox"><span className="folder-ui-checkmark" style={{ opacity: 0 }}>✓</span></div>
      </div>
      
      <div className="folder-table-td" style={{ flex: 1 }}>
        <span className="folder-table-row-title">{bookmark.title}</span>
      </div>

      <div className="folder-table-td" style={{ width: 200, color: "#888", fontSize: 14 }}>
        {formattedDate}
      </div>

      <div className="folder-table-td" style={{ width: 160 }}>
        <div className="folder-avatar-wrap">
          <span className="folder-avatar" style={{ background: bg }}>
            {initials}
          </span>
          <span className="folder-avatar-name">{domain}</span>
        </div>
      </div>

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
