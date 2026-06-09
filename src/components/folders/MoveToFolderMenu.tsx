"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderIcon } from "@phosphor-icons/react";
import { moveBookmarkToFolder } from "@/lib/folder-actions";
import { buildFolderTree, flattenFolderTree } from "@/lib/folders";
import type { BookmarkFolder } from "@/lib/types";

type MoveToFolderMenuProps = {
  bookmarkId: string;
  currentFolderId?: string | null;
  folders: BookmarkFolder[];
  onMoved?: () => void;
};

export function MoveToFolderMenu({
  bookmarkId,
  currentFolderId,
  folders,
  onMoved,
}: MoveToFolderMenuProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [movingTo, setMovingTo] = useState<string | null | undefined>(undefined);

  const tree = buildFolderTree(folders);
  const flatOptions = flattenFolderTree(tree);

  function handleMove(folderId: string | null) {
    if (folderId === currentFolderId) return;
    setMovingTo(folderId);
    startTransition(async () => {
      const result = await moveBookmarkToFolder(bookmarkId, folderId);
      if (result.success) {
        onMoved?.();
        router.refresh();
      }
      setMovingTo(undefined);
    });
  }

  const isMoving = isPending;

  return (
    <div className="move-folder-menu" role="menu" aria-label="Move to folder">
      <p className="move-folder-menu-label">Move to folder</p>

      <button
        type="button"
        role="menuitem"
        className={`move-folder-menu-item ${!currentFolderId ? "active" : ""}`}
        onClick={() => handleMove(null)}
        disabled={isMoving || !currentFolderId}
        aria-pressed={!currentFolderId}
      >
        <FolderIcon size={13} aria-hidden="true" />
        Uncategorized
        {!currentFolderId && <span className="move-folder-current">(current)</span>}
      </button>

      {flatOptions.map(({ folder, depth }) => {
        const isCurrent = folder.id === currentFolderId;
        const isTarget = movingTo === folder.id;
        return (
          <button
            key={folder.id}
            type="button"
            role="menuitem"
            className={`move-folder-menu-item depth-${depth} ${isCurrent ? "active" : ""}`}
            onClick={() => handleMove(folder.id)}
            disabled={isMoving || isCurrent}
            aria-pressed={isCurrent}
            style={{ paddingLeft: `${0.75 + depth * 0.75}rem` }}
          >
            <FolderIcon
              size={13}
              aria-hidden="true"
              style={folder.color ? { color: folder.color } : undefined}
            />
            {folder.name}
            {isCurrent && <span className="move-folder-current">(current)</span>}
            {isTarget && <span className="move-folder-current">Moving…</span>}
          </button>
        );
      })}

      {folders.length === 0 && (
        <p className="move-folder-menu-empty">No folders yet. Create one from the sidebar.</p>
      )}
    </div>
  );
}
