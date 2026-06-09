import type { BookmarkFolder, BookmarkFolderTreeNode } from "@/lib/types";

/**
 * Build a nested folder tree from a flat list of folders.
 * Folders are sorted by sort_order then name at each level.
 */
export function buildFolderTree(folders: BookmarkFolder[]): BookmarkFolderTreeNode[] {
  const nodeMap = new Map<string, BookmarkFolderTreeNode>();

  // Initialize all nodes
  for (const folder of folders) {
    nodeMap.set(folder.id, { ...folder, children: [] });
  }

  const roots: BookmarkFolderTreeNode[] = [];

  // Wire up parent-child relationships
  for (const node of nodeMap.values()) {
    if (node.parent_id === null || node.parent_id === undefined) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(node.parent_id);
      if (parent) {
        parent.children.push(node);
      } else {
        // Orphaned folder (parent deleted?), treat as root
        roots.push(node);
      }
    }
  }

  // Sort each level
  const sortNodes = (nodes: BookmarkFolderTreeNode[]) => {
    nodes.sort((a, b) => {
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      return a.name.localeCompare(b.name);
    });
    for (const node of nodes) sortNodes(node.children);
  };

  sortNodes(roots);
  return roots;
}

/**
 * Get the depth of a folder in the tree (0 = root, 1 = first level subfolder, etc.)
 */
export function getFolderDepth(folders: BookmarkFolder[], folderId: string): number {
  const folderMap = new Map(folders.map((f) => [f.id, f]));
  let depth = 0;
  let current = folderMap.get(folderId);

  while (current?.parent_id) {
    depth++;
    current = folderMap.get(current.parent_id);
    if (depth > 10) break; // Safety guard against cycles
  }

  return depth;
}

/**
 * Get all descendant folder IDs (not including the folder itself).
 */
export function getFolderDescendantIds(folders: BookmarkFolder[], folderId: string): string[] {
  const result: string[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = folders.filter((f) => f.parent_id === current);
    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }

  return result;
}

/**
 * Check if `folderId` is a descendant of `possibleAncestorId`.
 * Used to prevent moving a folder into its own descendant.
 */
export function isDescendantFolder(
  folders: BookmarkFolder[],
  folderId: string,
  possibleAncestorId: string
): boolean {
  const descendantIds = getFolderDescendantIds(folders, possibleAncestorId);
  return descendantIds.includes(folderId);
}

/**
 * Get the breadcrumb trail for a folder: array from root → current folder.
 * Includes the current folder as the last item.
 */
export function getFolderBreadcrumbs(
  folders: BookmarkFolder[],
  folderId: string
): BookmarkFolder[] {
  const folderMap = new Map(folders.map((f) => [f.id, f]));
  const breadcrumbs: BookmarkFolder[] = [];
  let current = folderMap.get(folderId);

  while (current) {
    breadcrumbs.unshift(current);
    if (!current.parent_id) break;
    current = folderMap.get(current.parent_id);
  }

  return breadcrumbs;
}

/**
 * Flat folder list suitable for a <select> element, with depth-based indentation.
 * Returns sorted list with depth info.
 */
export function flattenFolderTree(
  tree: BookmarkFolderTreeNode[],
  depth = 0
): Array<{ folder: BookmarkFolder; depth: number }> {
  const result: Array<{ folder: BookmarkFolder; depth: number }> = [];

  for (const node of tree) {
    result.push({ folder: node, depth });
    if (node.children.length > 0) {
      result.push(...flattenFolderTree(node.children, depth + 1));
    }
  }

  return result;
}
