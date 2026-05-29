"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, StickyNote } from "lucide-react";

export function CanvasSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar" id="sidebar">
      <div className="logo">
        <img src="/assets/logo.svg" alt="Logo" />
      </div>

      <nav className="nav-section">
        <p className="nav-label">Library</p>
        <Link
          href="/"
          className={`nav-item ${pathname === "/" ? "active" : ""}`}
        >
          <LayoutGrid size={13} />
          All bookmarks
        </Link>
        <Link
          href="/canvas"
          className={`nav-item ${pathname === "/canvas" ? "active" : ""}`}
        >
          <StickyNote size={13} />
          Canvas
        </Link>
      </nav>
    </aside>
  );
}
