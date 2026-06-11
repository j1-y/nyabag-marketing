"use client";

import { FileText, Grid } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
;

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
          href="/app"
          className={`nav-item ${pathname === "/app" ? "active" : ""}`}
        >
          <Grid size={13} />
          All bookmarks
        </Link>
        <Link
          href="/app/canvas"
          className={`nav-item ${pathname === "/app/canvas" ? "active" : ""}`}
        >
          <FileText size={13} />
          Canvas
        </Link>
      </nav>
    </aside>
  );
}
