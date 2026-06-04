"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { Bookmark } from "@/lib/types";
import { deleteBookmark, getProcessingBookmarks } from "@/lib/actions";

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
  importOpen: boolean;
  openImport: () => void;
  closeImport: () => void;
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
  const [activeFilter, setActiveFilter] = useState<"all" | "recent">(() => {
    if (typeof window === "undefined") return "all";
    try {
      const stored = window.localStorage.getItem("nyabag:dashboard-filter");
      return stored === "all" || stored === "recent" ? stored : "all";
    } catch {
      return "all";
    }
  });
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Bookmark | null>(null);
  const [detailTarget, setDetailTarget] = useState<Bookmark | null>(null);

  const setPersistentActiveFilter = useCallback((filter: "all" | "recent") => {
    setActiveFilter(filter);
    try {
      window.localStorage.setItem("nyabag:dashboard-filter", filter);
    } catch {
      // Do not store private bookmark data; ignore preference storage failures.
    }
  }, []);

  useEffect(() => {
    if (!bookmarks.some((bookmark) => bookmark.processing_status === "processing")) return;

    let attempts = 0;
    let cancelled = false;
    const maxAttempts = 24;

    const interval = window.setInterval(async () => {
      attempts += 1;
      const result = await getProcessingBookmarks();
      if (cancelled) return;
      if (result.success) {
        setBookmarks(result.data);
        if (!result.data.some((bookmark) => bookmark.processing_status === "processing")) {
          window.clearInterval(interval);
        }
      }
      if (attempts >= maxAttempts) window.clearInterval(interval);
    }, 3500);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [bookmarks]);

  const deleteItem = useCallback(async (id: string) => {
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
  }, [bookmarks, detailTarget?.id, editTarget?.id]);

  const addPendingBookmark = useCallback((bookmark: PendingBookmark) => {
    setPendingBookmarks((prev) => [bookmark, ...prev]);
  }, []);

  const removePendingBookmark = useCallback((id: string) => {
    setPendingBookmarks((prev) => prev.filter((bookmark) => bookmark.id !== id));
  }, []);

  const openAdd = useCallback(() => setAddOpen(true), []);
  const closeAdd = useCallback(() => setAddOpen(false), []);
  const openImport = useCallback(() => setImportOpen(true), []);
  const closeImport = useCallback(() => setImportOpen(false), []);
  const openEdit = useCallback((b: Bookmark) => setEditTarget(b), []);
  const closeEdit = useCallback(() => setEditTarget(null), []);
  const openDetail = useCallback((b: Bookmark) => setDetailTarget(b), []);
  const closeDetail = useCallback(() => setDetailTarget(null), []);

  const filtered = useMemo(() => {
    let list = [...bookmarks];
    if (activeFilter === "recent") list = list.slice(0, 10);
    if (activeTag !== "All") list = list.filter((b) => b.tags.includes(activeTag));
    const q = search.toLowerCase().trim();
    if (q)
      list = list.filter(
        (b) =>
          b.title.toLowerCase().includes(q) ||
          b.url.toLowerCase().includes(q) ||
          b.summary.toLowerCase().includes(q) ||
          b.tags.some((t) => t.toLowerCase().includes(q)) ||
          b.note.toLowerCase().includes(q)
      );
    return list;
  }, [activeFilter, activeTag, bookmarks, search]);

  const value = useMemo<BookmarksCtx>(
    () => ({
      bookmarks, setBookmarks,
      pendingBookmarks,
      addPendingBookmark,
      removePendingBookmark,
      activeTag, setActiveTag,
      activeFilter, setActiveFilter: setPersistentActiveFilter,
      search, setSearch,
      addOpen,
      openAdd,
      closeAdd,
      importOpen,
      openImport,
      closeImport,
      editTarget,
      openEdit,
      closeEdit,
      detailTarget,
      openDetail,
      closeDetail,
      deleteItem,
      filtered,
    }),
    [
      activeFilter,
      activeTag,
      addOpen,
      addPendingBookmark,
      bookmarks,
      closeAdd,
      closeDetail,
      closeEdit,
      closeImport,
      deleteItem,
      detailTarget,
      editTarget,
      filtered,
      importOpen,
      openAdd,
      openDetail,
      openEdit,
      openImport,
      pendingBookmarks,
      removePendingBookmark,
      search,
      setPersistentActiveFilter,
    ]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
    </Ctx.Provider>
  );
}

export function useBookmarks(): BookmarksCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useBookmarks must be used within BookmarksProvider");
  return ctx;
}
