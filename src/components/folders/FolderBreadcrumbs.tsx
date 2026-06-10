import Link from "next/link";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr";
import type { BookmarkFolder } from "@/lib/types";

type FolderBreadcrumbsProps = {
  breadcrumbs: BookmarkFolder[];
  /** If true, shows "Inbox" as the leaf item with no parent link */
  isInbox?: boolean;
};

export function FolderBreadcrumbs({ breadcrumbs, isInbox }: FolderBreadcrumbsProps) {
  return (
    <nav className="folder-breadcrumbs" aria-label="Folder navigation">
      <Link href="/app" className="folder-breadcrumb-item folder-breadcrumb-link">
        <CopyIcon weight="fill" size={14} aria-hidden="true" className="folder-breadcrumb-icon" />
        <span className="folder-breadcrumb-text">Documents</span>
      </Link>

      {isInbox ? (
        <>
          <span className="folder-breadcrumb-sep" aria-hidden="true">&middot;</span>
          <span className="folder-breadcrumb-item folder-breadcrumb-current">Inbox</span>
        </>
      ) : (
        breadcrumbs.map((folder, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={folder.id} className="folder-breadcrumb-group">
              <span className="folder-breadcrumb-sep" aria-hidden="true">&middot;</span>
              {isLast ? (
                <span className="folder-breadcrumb-item folder-breadcrumb-current">
                  {folder.name}
                </span>
              ) : (
                <Link
                  href={`/app/folders/${folder.id}`}
                  className="folder-breadcrumb-item folder-breadcrumb-link"
                >
                  <span className="folder-breadcrumb-text">{folder.name}</span>
                </Link>
              )}
            </span>
          );
        })
      )}
    </nav>
  );
}
