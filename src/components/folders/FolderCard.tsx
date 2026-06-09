import Link from "next/link";
import { FolderIcon } from "@phosphor-icons/react/dist/ssr";
import type { BookmarkFolder } from "@/lib/types";

type FolderCardProps = {
  folder: BookmarkFolder;
  bookmarkCount?: number;
};

export function FolderCard({ folder, bookmarkCount }: FolderCardProps) {
  return (
    <Link
      href={`/app/folders/${folder.id}`}
      className="folder-card"
      aria-label={`Open folder: ${folder.name}`}
    >
      <div
        className="folder-card-icon"
        style={folder.color ? { color: folder.color } : undefined}
        aria-hidden="true"
      >
        <FolderIcon size={20} weight="fill" />
      </div>
      <div className="folder-card-body">
        <p className="folder-card-title">{folder.name}</p>
        {(bookmarkCount !== undefined || folder.description) && (
          <p className="folder-card-meta">
            {bookmarkCount !== undefined
              ? `${bookmarkCount} bookmark${bookmarkCount !== 1 ? "s" : ""}`
              : folder.description || ""}
          </p>
        )}
      </div>
    </Link>
  );
}
