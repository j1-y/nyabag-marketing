"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookmarksIcon, PlusIcon } from "@phosphor-icons/react";
import { BookmarksProvider, useBookmarks } from "@/hooks/useBookmarks";
import { BookmarkCard } from "./BookmarkCard";
import { PendingBookmarkCard } from "./PendingBookmarkCard";
import { AddBookmarkModal } from "./AddBookmarkModal";
import { EditBookmarkModal } from "./EditBookmarkModal";
import type { Bookmark } from "@/lib/types";
import { Topbar } from "../layout/Topbar";

function getFirstName(profileName: string, userEmail: string) {
  const source = profileName.trim() || userEmail.split("@")[0]?.trim() || "";
  if (!source) return "there";
  return source.split(/[._\-\s]+/).filter(Boolean)[0] || "there";
}

function getLocalGreetingPrefix(date: Date) {
  const day = date.getDay();
  const hour = date.getHours();

  if (day === 0) return "Sunday moodboardmaxxing";
  if (day === 6) return "Weekend inspo haul";
  if (hour < 12) return "Coffee and pixels";
  if (hour < 17) return "Designmaxxing today";
  if (hour < 21) return "Evening reference raid";
  return "Late-night idea dump";
}

function DashboardGreeting({
  profileName,
  userEmail,
  onNewBookmark,
}: {
  profileName: string;
  userEmail: string;
  onNewBookmark: () => void;
}) {
  const [prefix, setPrefix] = useState(getLocalGreetingPrefix(new Date()));
  const firstName = useMemo(() => getFirstName(profileName, userEmail), [profileName, userEmail]);

  useEffect(() => {
    function updateGreeting() {
      setPrefix(getLocalGreetingPrefix(new Date()));
    }

    updateGreeting();
    const interval = window.setInterval(updateGreeting, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="dashboard-greeting dashboard-enter" aria-label="Dashboard greeting">
      <h1>{prefix}, {firstName}?</h1>
      <div className="dashboard-greeting-actions">
        <button type="button" className="dashboard-new-bookmark-btn" onClick={onNewBookmark}>
          <span className="dashboard-new-bookmark-inner">
            <PlusIcon size={17} weight="bold" />
            New bookmark
          </span>
        </button>
      </div>
    </section>
  );
}

function GridInner({
  profileName,
  userEmail,
}: {
  profileName: string;
  userEmail: string;
}) {
  const { filtered, pendingBookmarks, openAdd, openEdit, deleteItem } = useBookmarks();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("add") === "1") {
      openAdd();
      router.replace("/app");
    }
  }, [openAdd, router, searchParams]);

  return (
    <>
      <Topbar />
      <DashboardGreeting profileName={profileName} userEmail={userEmail} onNewBookmark={openAdd} />

      {/* Grid */}
      {filtered.length === 0 && pendingBookmarks.length === 0 ? (
        <div className="empty-state dashboard-enter dashboard-enter-delayed">
          <div className="empty-state-icon" aria-hidden="true">
            <BookmarksIcon  size={24} weight="duotone" />
          </div>
          <h2>No bookmarks yet</h2>
          <p>Save websites, references, and ideas into a visual board.</p>
          <button className="btn-primary empty-state-action" onClick={openAdd}>
            <PlusIcon size={15} weight="bold" /> Add bookmark
          </button>
        </div>
      ) : (
        <div className="bm-grid view-moodboard dashboard-enter dashboard-enter-delayed">
          {pendingBookmarks.map((bookmark) => (
            <PendingBookmarkCard key={bookmark.id} bookmark={bookmark} />
          ))}
          {filtered.map((b, i) => (
            <BookmarkCard key={b.id} bookmark={b} index={i} onEdit={openEdit} onDelete={deleteItem} />
          ))}
        </div>
      )}

      {/* Modals */}
      <AddBookmarkModal />
      <EditBookmarkModal />
    </>
  );
}

export function BookmarkGrid({
  initialBookmarks,
  userEmail,
  profileName,
}: {
  initialBookmarks: Bookmark[];
  userEmail: string;
  profileName: string;
}) {
  return (
    <BookmarksProvider initial={initialBookmarks}>
      <GridInner profileName={profileName} userEmail={userEmail} />
    </BookmarksProvider>
  );
}
