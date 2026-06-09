import { FolderIcon } from "@phosphor-icons/react/dist/ssr";

type FolderEmptyStateProps = {
  isUncategorized?: boolean;
};

export function FolderEmptyState({ isUncategorized }: FolderEmptyStateProps) {
  if (isUncategorized) {
    return (
      <div className="folder-empty-state">
        <div className="folder-empty-state-icon" aria-hidden="true">
          <FolderIcon size={24} weight="duotone" />
        </div>
        <h3>All organized</h3>
        <p>All your bookmarks are inside folders.</p>
      </div>
    );
  }

  return (
    <div className="folder-empty-state">
      <div className="folder-empty-state-icon" aria-hidden="true">
        <FolderIcon size={24} weight="duotone" />
      </div>
      <h3>This folder is empty</h3>
      <p>Move bookmarks here or create a subfolder.</p>
    </div>
  );
}
