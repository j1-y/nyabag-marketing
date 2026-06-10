"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { TrayIcon, FolderPlusIcon, CaretDownIcon, CaretRightIcon, FolderOpenIcon } from "@phosphor-icons/react";
import { FolderCreateDialog } from "./FolderCreateDialog";
import { FolderTreeItem } from "./FolderTreeItem";
import { buildFolderTree } from "@/lib/folders";
import type { BookmarkFolder } from "@/lib/types";

const EXPANDED_KEY = "nyabag-folder-expanded";

function loadExpandedIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const stored = window.localStorage.getItem(EXPANDED_KEY);
    if (!stored) return new Set();
    return new Set(JSON.parse(stored) as string[]);
  } catch {
    return new Set();
  }
}

function saveExpandedIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(EXPANDED_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

type FolderTreeProps = {
  folders: BookmarkFolder[];
  collapsed?: boolean;
};

export function FolderTree({ folders, collapsed }: FolderTreeProps) {
  const pathname = usePathname();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setExpandedIds(loadExpandedIds());
  }, []);

  // Auto-expand the active folder's ancestors
  useEffect(() => {
    const match = pathname.match(/^\/app\/folders\/([^/]+)$/);
    if (!match) return;
    const activeFolderId = match[1];
    if (activeFolderId === "inbox") return;

    setExpandedIds((prev) => {
      // Find ancestor folders
      const activeFolder = folders.find((f) => f.id === activeFolderId);
      if (!activeFolder?.parent_id) return prev;

      const next = new Set(prev);
      let current = folders.find((f) => f.id === activeFolder.parent_id);
      while (current) {
        next.add(current.id);
        current = current.parent_id ? folders.find((f) => f.id === current!.parent_id) : undefined;
      }
      saveExpandedIds(next);
      return next;
    });
  }, [pathname, folders]);

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      saveExpandedIds(next);
      return next;
    });
  }, []);

  const tree = buildFolderTree(folders);
  const uncatActive = pathname === "/app/folders/inbox";

  if (collapsed) {
    return null; // Sidebar collapsed — don't show tree
  }

  return (
    <div className="folder-tree">
      <div className="folder-tree-section-header">
        <span className="folder-tree-section-label">Design Folders</span>
        <button
          type="button"
          className="folder-tree-new-btn"
          onClick={() => setCreateOpen(true)}
          aria-label="Create design folder"
          title="New folder"
        >
          <FolderPlusIcon size={16} weight="regular" />
        </button>
      </div>

      <nav className="folder-tree-nav" aria-label="Folders">
        {/* Inbox */}
        <Link
          href="/app/folders/inbox"
          className={`folder-tree-static-item folder-tree-root-item ${uncatActive ? "active" : ""}`}
          title="Inbox bookmarks"
        >
          <span className="folder-tree-chevron-placeholder" />
          <TrayIcon size={16} aria-hidden="true" className="folder-tree-root-icon" />
          <span className="folder-tree-root-label">Inbox</span>
        </Link>

        {/* User folders */}
        {tree.length > 0 ? (
          <ul className="folder-tree-list" role="tree" aria-label="Your folders">
            {tree.map((node) => (
              <FolderTreeItem
                key={node.id}
                node={node}
                depth={0}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </ul>
        ) : (
          <p className="folder-tree-empty">No folders yet.</p>
        )}
      </nav>

      <FolderCreateDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
