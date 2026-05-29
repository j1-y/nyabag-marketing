"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, StickyNote } from "lucide-react";

export function FeatureSwitch() {
  const pathname = usePathname();
  const isNotes = pathname.startsWith("/canvas");

  return (
    <nav className="feature-switch" aria-label="Primary">
      <Link href="/" className={`feature-switch-item ${!isNotes ? "active" : ""}`}>
        <LayoutGrid size={14} />
        Bookmarks
      </Link>
      <Link href="/canvas" className={`feature-switch-item ${isNotes ? "active" : ""}`}>
        <StickyNote size={14} />
        Notes
      </Link>
    </nav>
  );
}
