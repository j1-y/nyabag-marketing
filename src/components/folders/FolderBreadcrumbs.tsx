import Link from "next/link";
import { CaretRightIcon, HouseIcon } from "@phosphor-icons/react/dist/ssr";
import type { BookmarkFolder } from "@/lib/types";

type FolderBreadcrumbsProps = {
  breadcrumbs: BookmarkFolder[];
  /** If true, shows "Uncategorized" as the leaf item with no parent link */
  isUncategorized?: boolean;
};

export function FolderBreadcrumbs({ breadcrumbs, isUncategorized }: FolderBreadcrumbsProps) {
  return (
    <nav className="folder-breadcrumbs" aria-label="Folder navigation">
      <Link href="/app" className="folder-breadcrumb-item folder-breadcrumb-link">
        <HouseIcon size={13} aria-hidden="true" />
        All bookmarks
      </Link>

      {isUncategorized ? (
        <>
          <CaretRightIcon size={12} className="folder-breadcrumb-sep" aria-hidden="true" />
          <span className="folder-breadcrumb-item folder-breadcrumb-current">Uncategorized</span>
        </>
      ) : (
        breadcrumbs.map((folder, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={folder.id} className="folder-breadcrumb-group">
              <CaretRightIcon size={12} className="folder-breadcrumb-sep" aria-hidden="true" />
              {isLast ? (
                <span className="folder-breadcrumb-item folder-breadcrumb-current">
                  {folder.name}
                </span>
              ) : (
                <Link
                  href={`/app/folders/${folder.id}`}
                  className="folder-breadcrumb-item folder-breadcrumb-link"
                >
                  {folder.name}
                </Link>
              )}
            </span>
          );
        })
      )}
    </nav>
  );
}
