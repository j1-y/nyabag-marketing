"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NoteIcon, SquaresFourIcon } from "@phosphor-icons/react";

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
          <SquaresFourIcon size={13} />
          All bookmarks
        </Link>
        <Link
          href="/canvas"
          className={`nav-item ${pathname === "/canvas" ? "active" : ""}`}
        >
          <NoteIcon size={13} />
          Canvas
        </Link>
      </nav>
    </aside>
  );
}
