"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NoteIcon, SquaresFourIcon } from "@phosphor-icons/react";

export function FeatureSwitch() {
  const pathname = usePathname();
  const isNotes = pathname.startsWith("/app/canvas");

  return (
    <nav className="feature-switch" aria-label="Primary">
      <Link href="/app" className={`feature-switch-item ${!isNotes ? "active" : ""}`}>
        <SquaresFourIcon size={14} weight="bold" />
        Bookmarks
      </Link>
      <Link href="/app/canvas" className={`feature-switch-item ${isNotes ? "active" : ""}`}>
        <NoteIcon size={14} weight="bold" />
        Canvas
      </Link>
    </nav>
  );
}
