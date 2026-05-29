"use client";

import { Search, Plus } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";

export function Topbar() {
  const { search, setSearch, openAdd } = useBookmarks();
  const shortcutLabel =
    typeof navigator !== "undefined" && /mac/i.test(navigator.platform)
      ? "⌘ K"
      : "Ctrl K";

  return (
    <section className="topbar bookmark-controls" aria-label="Bookmark controls">
      <div className="search-wrap">
        <Search size={13} />
        <input
          type="text"
          placeholder="Search bookmarks, tags, URLs..."
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <kbd suppressHydrationWarning>{shortcutLabel}</kbd>
      </div>

      <button className="btn-primary btn-sm topbar-add" onClick={openAdd}>
        <Plus size={13} />
        Add
      </button>
    </section>
  );
}
