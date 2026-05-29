"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Bookmark } from "@/lib/types";
import { deleteBookmark } from "@/lib/actions";

export type PendingBookmark = {
  id: string;
  title: string;
  url: string;
};

interface BookmarksCtx {
  bookmarks: Bookmark[];
  setBookmarks: Dispatch<SetStateAction<Bookmark[]>>;
  pendingBookmarks: PendingBookmark[];
  addPendingBookmark: (bookmark: PendingBookmark) => void;
  removePendingBookmark: (id: string) => void;
  activeTag: string;
  setActiveTag: (t: string) => void;
  activeFilter: "all" | "recent";
  setActiveFilter: (f: "all" | "recent") => void;
  search: string;
  setSearch: (s: string) => void;
  // Modal state
  addOpen: boolean;
  openAdd: () => void;
  closeAdd: () => void;
  editTarget: Bookmark | null;
  openEdit: (b: Bookmark) => void;
  closeEdit: () => void;
  detailTarget: Bookmark | null;
  openDetail: (b: Bookmark) => void;
  closeDetail: () => void;
  deleteItem: (id: string) => void;
  // Derived
  filtered: Bookmark[];
}

const Ctx = createContext<BookmarksCtx | null>(null);

export function BookmarksProvider({
  children,
  initial,
}: {
  children: ReactNode;
  initial: Bookmark[];
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(initial);
  const [pendingBookmarks, setPendingBookmarks] = useState<PendingBookmark[]>([]);
  const [activeTag, setActiveTag] = useState("All");
  const [activeFilter, setActiveFilter] = useState<"all" | "recent">("all");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bookmark | null>(null);
  const [detailTarget, setDetailTarget] = useState<Bookmark | null>(null);

  const deleteItem = async (id: string) => {
    // Keep reference to previous state for rollback
    const previousBookmarks = bookmarks;
    
    // Optimistic UI update
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    if (detailTarget?.id === id) setDetailTarget(null);
    if (editTarget?.id === id) setEditTarget(null);
    
    try {
      const result = await deleteBookmark(id);
      if (!result.success) {
        console.error("Delete failed:", result.error);
        alert(`Failed to delete bookmark: ${result.error}`);
        // Revert optimistic update
        setBookmarks(previousBookmarks);
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("An unexpected error occurred while deleting the bookmark.");
      // Revert optimistic update
      setBookmarks(previousBookmarks);
    }
  };

  const addPendingBookmark = (bookmark: PendingBookmark) => {
    setPendingBookmarks((prev) => [bookmark, ...prev]);
  };

  const removePendingBookmark = (id: string) => {
    setPendingBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
  };

  const filtered = (() => {
    let list = [...bookmarks];
    if (activeFilter === "recent") list = list.slice(0, 10);
    if (activeTag !== "All") list = list.filter((b) => b.tags.includes(activeTag));
    const q = search.toLowerCase().trim();
    if (q)
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q)) ||
          b.note.toLowerCase().includes(q)
      );
    return list;
  })();

  return (
    <Ctx.Provider
      value={{
        bookmarks, setBookmarks,
        pendingBookmarks,
        addPendingBookmark,
        removePendingBookmark,
        activeTag, setActiveTag,
        activeFilter, setActiveFilter,
        search, setSearch,
        addOpen,
        openAdd: () => setAddOpen(true),
        closeAdd: () => setAddOpen(false),
        editTarget,
        openEdit: (b) => setEditTarget(b),
        closeEdit: () => setEditTarget(null),
        detailTarget,
        openDetail: (b) => setDetailTarget(b),
        closeDetail: () => setDetailTarget(null),
        deleteItem,
        filtered,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useBookmarks(): BookmarksCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarksProvider");
  return ctx;
}
