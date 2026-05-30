"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon, PlusIcon } from "@phosphor-icons/react";
import { useBookmarks } from "@/hooks/useBookmarks";

export function Topbar() {
  const { search, setSearch, openAdd } = useBookmarks();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const shortcutLabel =
    typeof navigator !== "undefined" && /mac/i.test(navigator.platform)
      ? "Cmd K"
      : "Ctrl K";

  useEffect(() => {
    if (searchParams.get("search") === "1") {
      inputRef.current?.focus();
      router.replace("/");
    }
  }, [router, searchParams]);

  return (
    <section className="topbar bookmark-controls" aria-label="Bookmark controls">
      <div className="search-wrap">
        <MagnifyingGlassIcon size={13} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search bookmarks, tags, URLs..."
          autoComplete="off"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <kbd suppressHydrationWarning>{shortcutLabel}</kbd>
      </div>

      <button className="btn-primary btn-sm topbar-add" onClick={openAdd}>
        <PlusIcon size={13} weight="bold" />
        Add
      </button>
    </section>
  );
}
