"use client";

import { useState } from "react";
import { FolderPlusIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { FolderCreateDialog } from "./FolderCreateDialog";
import { FolderRenameDialog } from "./FolderRenameDialog";
import { FolderDeleteDialog } from "./FolderDeleteDialog";
import type { BookmarkFolder } from "@/lib/types";

type FolderDetailHeaderProps = {
  folder: BookmarkFolder | null;
  isUncategorized: boolean;
  bookmarkCount: number;
  subfolderCount: number;
  allFolders: BookmarkFolder[];
  onAddBookmark?: () => void;
};

export function FolderDetailHeader({
  folder,
  isUncategorized,
  bookmarkCount,
  subfolderCount,
  onAddBookmark,
}: FolderDetailHeaderProps) {
  const [createSubfolderOpen, setCreateSubfolderOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const metaParts: string[] = [];
  if (bookmarkCount > 0) metaParts.push(`${bookmarkCount} bookmark${bookmarkCount !== 1 ? "s" : ""}`);
  if (!isUncategorized && subfolderCount > 0)
    metaParts.push(`${subfolderCount} subfolder${subfolderCount !== 1 ? "s" : ""}`);

  if (isUncategorized) {
    return (
      <div className="folder-detail-header">
        <div className="folder-detail-header-top">
          <div>
            <h1 className="folder-detail-title">Uncategorized</h1>
            <p className="folder-detail-meta">
              {bookmarkCount > 0
                ? `${bookmarkCount} bookmark${bookmarkCount !== 1 ? "s" : ""} without a folder`
                : "Bookmarks without a folder"}
            </p>
          </div>
          {onAddBookmark && (
            <div className="folder-detail-actions">
              <button
                type="button"
                className="folder-action-btn folder-action-btn-primary"
                onClick={onAddBookmark}
                aria-label="Add bookmark"
              >
                <PlusIcon size={14} weight="bold" />
                <span>Add bookmark</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!folder) return null;

  return (
    <div className="folder-detail-header">
      <div className="folder-detail-header-top">
        <div>
          <h1
            className="folder-detail-title"
            style={folder.color ? { color: folder.color } : undefined}
          >
            {folder.name}
          </h1>
          {metaParts.length > 0 && (
            <p className="folder-detail-meta">{metaParts.join(" · ")}</p>
          )}
          {folder.description && (
            <p className="folder-detail-description">{folder.description}</p>
          )}
        </div>

        <div className="folder-detail-actions">
          {onAddBookmark && (
            <button
              type="button"
              className="folder-action-btn folder-action-btn-primary"
              onClick={onAddBookmark}
              aria-label="Add bookmark"
            >
              <PlusIcon size={14} weight="bold" />
              <span>Add bookmark</span>
            </button>
          )}
          <button
            type="button"
            className="folder-action-btn"
            onClick={() => setCreateSubfolderOpen(true)}
            aria-label="Create subfolder"
            title="New subfolder"
          >
            <FolderPlusIcon size={15} />
            <span>New subfolder</span>
          </button>
          <button
            type="button"
            className="folder-action-btn"
            onClick={() => setRenameOpen(true)}
            aria-label="Rename folder"
            title="Rename"
          >
            <PencilSimpleIcon size={15} />
            <span>Rename</span>
          </button>
          <button
            type="button"
            className="folder-action-btn folder-action-btn-danger"
            onClick={() => setDeleteOpen(true)}
            aria-label="Delete folder"
            title="Delete"
          >
            <TrashIcon size={15} />
            <span>Delete</span>
          </button>
        </div>
      </div>

      <FolderCreateDialog
        open={createSubfolderOpen}
        onOpenChange={setCreateSubfolderOpen}
        parentFolder={folder}
      />
      {folder && (
        <>
          <FolderRenameDialog
            folder={folder}
            open={renameOpen}
            onOpenChange={setRenameOpen}
          />
          <FolderDeleteDialog
            folder={folder}
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
          />
        </>
      )}
    </div>
  );
}
