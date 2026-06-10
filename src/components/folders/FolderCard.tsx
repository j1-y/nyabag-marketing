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
      className="folder-grid-card"
      aria-label={`Open folder: ${folder.name}`}
    >
      <div className="folder-grid-icon-wrap" aria-hidden="true">
        <svg width="72" height="60" viewBox="0 0 72 60" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="0" y="10" width="72" height="50" rx="6" fill="url(#fg)" />
          <rect x="0" y="10" width="28" height="10" rx="4" fill="url(#tab)" />
          <defs>
            <linearGradient id="fg" x1="36" y1="10" x2="36" y2="60" gradientUnits="userSpaceOnUse">
              <stop stopColor="#6eb3f7" />
              <stop offset="1" stopColor="#3a87e0" />
            </linearGradient>
            <linearGradient id="tab" x1="0" y1="10" x2="28" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9acffe" />
              <stop offset="1" stopColor="#5ba8ef" />
            </linearGradient>
          </defs>
          <rect x="6" y="16" width="60" height="20" rx="3" fill="white" fillOpacity="0.15" />
        </svg>
      </div>
      <p className="folder-grid-name">{folder.name}</p>
      {(bookmarkCount !== undefined || folder.description) && (
        <p className="folder-grid-meta">
          {bookmarkCount !== undefined
            ? `${bookmarkCount} bookmark${bookmarkCount !== 1 ? "s" : ""}`
            : folder.description || ""}
        </p>
      )}
    </Link>
  );
}
