"use client";

import { useCallback, useSyncExternalStore } from "react";
import { DashboardNav } from "./DashboardNav";
import { DashboardSidebar } from "./DashboardSidebar";

type DashboardShellProps = {
  children: React.ReactNode;
  userEmail: string;
  profileName: string;
  profileAvatarUrl: string | null;
};

const SIDEBAR_KEY = "nyabag-sidebar-collapsed";
const SIDEBAR_EVENT = "nyabag-sidebar-collapsed-change";

function getStoredSidebarState() {
  if (typeof window === "undefined") return false;
  const stored = window.localStorage.getItem(SIDEBAR_KEY);
  return stored ? stored === "true" : window.innerWidth <= 768;
}

function getServerSidebarState() {
  return false;
}

function subscribeToSidebarState(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_EVENT, onStoreChange);
  };
}

export function DashboardShell({
  children,
  userEmail,
  profileName,
  profileAvatarUrl,
}: DashboardShellProps) {
  const collapsed = useSyncExternalStore(
    subscribeToSidebarState,
    getStoredSidebarState,
    getServerSidebarState
  );

  const toggleSidebar = useCallback(() => {
    const next = !getStoredSidebarState();
    window.localStorage.setItem(SIDEBAR_KEY, String(next));
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  }, []);

  return (
    <div className={`app-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      <DashboardSidebar
        collapsed={collapsed}
        onToggle={toggleSidebar}
        userEmail={userEmail}
        profileName={profileName}
        profileAvatarUrl={profileAvatarUrl}
      />
      <div className="main-content">
        <DashboardNav />
        {children}
      </div>
    </div>
  );
}
