"use client";

import { Search, LogOut, Plus } from "lucide-react";
import { useBookmarks } from "@/hooks/useBookmarks";
import { signOut } from "@/lib/actions";

export function Topbar({ userEmail }: { userEmail: string }) {
  const { search, setSearch, openAdd } = useBookmarks();
  const shortcutLabel =
    typeof navigator !== "undefined" && /mac/i.test(navigator.platform)
      ? "⌘ K"
      : "Ctrl K";

  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img src="/assets/logo.svg" alt="Nyabag" />
      </div>

      <div className="search-wrap">
        <Search size={13} />
        <input
          type="text"
          placeholder="Search bookmarks, tags, URLs..."
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <kbd>{shortcutLabel}</kbd>
      </div>

      <button className="btn-primary btn-sm topbar-add" onClick={openAdd}>
        <Plus size={13} />
        Add
      </button>

      <form action={signOut}>
        <button
          type="submit"
          className="theme-toggle"
          title={`Sign out (${userEmail})`}
          aria-label="Sign out"
        >
          <LogOut size={14} />
        </button>
      </form>
    </header>
  );
}
