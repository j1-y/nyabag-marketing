"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
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

  if (hasOpenModal) return null;

  return (
    <section className="bookmark-search-bar bookmark-controls" aria-label="Bookmark search">
      <div className="search-wrap">
        <MagnifyingGlassIcon size={13} />
        <input
          ref={inputRef}
          type="text"
          placeholder={'Ask Nyabag: "dark bento grid SaaS hero"'}
          autoComplete="on"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <kbd suppressHydrationWarning>{shortcutLabel}</kbd>
      </div>
    </section>
  );
}
