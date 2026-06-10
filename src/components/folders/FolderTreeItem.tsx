"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CaretDownIcon,
  CaretRightIcon,
  DotsThreeIcon,
  FolderOpenIcon,
  FolderPlusIcon,
  PencilSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { FolderCreateDialog } from "./FolderCreateDialog";
import { FolderRenameDialog } from "./FolderRenameDialog";
import { FolderDeleteDialog } from "./FolderDeleteDialog";
import type { BookmarkFolderTreeNode } from "@/lib/types";

type FolderTreeItemProps = {
  node: BookmarkFolderTreeNode;
  depth?: number;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
};

export function FolderTreeItem({
  node,
  depth = 0,
  expandedIds,
  onToggleExpand,
}: FolderTreeItemProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createSubfolderOpen, setCreateSubfolderOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isActive = pathname === `/app/folders/${node.id}`;
  const isExpanded = expandedIds.has(node.id);
  const hasChildren = node.children.length > 0;
  const isSubfolder = depth > 0;

  function handleMenuToggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen((v) => !v);
  }

  function handleMenuBlur(e: React.FocusEvent) {
    if (!menuRef.current?.contains(e.relatedTarget as Node)) {
      setMenuOpen(false);
    }
  }

  return (
    <li className={`folder-tree-item-wrapper folder-tree-item-depth-${depth}`}>
      <div className={`folder-tree-item ${isActive ? "active" : ""}`}>
        {/* Chevron — hidden by default, revealed on hover via CSS */}
        <button
          type="button"
          className="folder-tree-chevron"
          onClick={(e) => {
            e.preventDefault();
            onToggleExpand(node.id);
          }}
          aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
          aria-expanded={isExpanded}
          tabIndex={hasChildren ? 0 : -1}
          style={{ visibility: hasChildren || depth === 0 ? "visible" : "hidden" }}
        >
          {isExpanded ? (
            <CaretDownIcon size={11} weight="bold" />
          ) : (
            <CaretRightIcon size={11} weight="bold" />
          )}
        </button>

        {/* Folder link */}
        <Link
          href={`/app/folders/${node.id}`}
          className={`folder-tree-item-link${isSubfolder ? " folder-tree-subfolder-link" : ""}`}
          title={node.name}
        >
          {/* Only root-level folders show the folder icon */}
          {!isSubfolder && (
            <FolderOpenIcon
              size={17}
              weight="regular"
              aria-hidden="true"
              style={node.color ? { color: node.color } : undefined}
            />
          )}
          <span className="folder-tree-item-name">{node.name}</span>
        </Link>

        {/* Context menu */}
        <div className="folder-tree-actions" ref={menuRef} onBlur={handleMenuBlur}>
          <button
            type="button"
            className="folder-tree-action-btn"
            onClick={handleMenuToggle}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label={`More options for ${node.name}`}
          >
            <DotsThreeIcon size={15} weight="bold" />
          </button>

          {menuOpen && (
            <div className="folder-tree-menu" role="menu">
              <button
                type="button"
                role="menuitem"
                className="folder-tree-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setCreateSubfolderOpen(true);
                }}
              >
                <FolderPlusIcon size={13} />
                New subfolder
              </button>
              <button
                type="button"
                role="menuitem"
                className="folder-tree-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setRenameOpen(true);
                }}
              >
                <PencilSimpleIcon size={13} />
                Rename
              </button>
              <button
                type="button"
                role="menuitem"
                className="folder-tree-menu-item folder-tree-menu-danger"
                onClick={() => {
                  setMenuOpen(false);
                  setDeleteOpen(true);
                }}
              >
                <TrashIcon size={13} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <ul className="folder-tree-children" role="group">
          {node.children.map((child) => (
            <FolderTreeItem
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      )}

      {/* Dialogs */}
      <FolderCreateDialog
        open={createSubfolderOpen}
        onOpenChange={setCreateSubfolderOpen}
        parentFolder={node}
      />
      <FolderRenameDialog
        folder={node}
        open={renameOpen}
        onOpenChange={setRenameOpen}
      />
      <FolderDeleteDialog
        folder={node}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </li>
  );
}
