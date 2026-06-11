"use client";

import { Search, Send } from "lucide-react";
import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useBookmarks } from "@/hooks/useBookmarks";

export function BookmarkSearchBar() {
  const { search, setSearch, addOpen, importOpen, editTarget } = useBookmarks();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasOpenModal = addOpen || importOpen || Boolean(editTarget);
  const shortcutLabel =
    typeof navigator !== "undefined" && /mac/i.test(navigator.platform)
      ? "Cmd K"
      : "Ctrl K";

  useEffect(() => {
    if (searchParams.get("search") !== "1") return;

    if (!hasOpenModal && searchParams.get("add") !== "1") {
      inputRef.current?.focus();
    }

    router.replace("/app");
  }, [hasOpenModal, router, searchParams]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (hasOpenModal) return;
      if (event.key.toLowerCase() !== "k") return;
      if (!event.ctrlKey && !event.metaKey) return;

      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasOpenModal]);

  if (hasOpenModal) return null;

  return (
    <form
      className="bookmark-search-bar bookmark-controls"
      aria-label="Bookmark search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        inputRef.current?.focus();
      }}
    >
      <div className="search-wrap">
        <Search size={16} />
        <input
          ref={inputRef}
          type="text"
          placeholder={'Ask Nyabag: "dark bento grid SaaS hero"'}
          autoComplete="on"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <kbd suppressHydrationWarning>{shortcutLabel}</kbd>
        <button type="submit" className="search-submit-btn" aria-label="Submit search">
          <Send size={15} fill="currentColor" />
        </button>
      </div>
    </form>
  );
}
