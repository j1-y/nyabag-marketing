"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookmarkSimpleIcon,
  CaretLeftIcon,
  CaretRightIcon,
  GearSixIcon,
  NoteIcon,
  PaletteIcon,
  SignOutIcon,
  UserIcon,
  type Icon,
} from "@phosphor-icons/react";
import { signOut } from "@/lib/actions";

type DashboardSidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  userEmail: string;
  profileName: string;
  profileAvatarUrl: string | null;
};

const primaryItems = [
  {
    href: "/app",
    label: "Bookmarks",
    icon: BookmarkSimpleIcon,
    isActive: (pathname: string) => pathname === "/app" || pathname.startsWith("/app/bookmarks"),
  },
  {
    href: "/app/canvas",
    label: "Canvas",
    icon: NoteIcon,
    isActive: (pathname: string) => pathname.startsWith("/app/canvas"),
  },
  {
    href: "/app/design-dna",
    label: "Design DNA",
    icon: PaletteIcon,
    isActive: (pathname: string) => pathname.startsWith("/app/design-dna"),
  },
];

function initials(name: string, email: string) {
  const source = name.trim() || email.trim();
  if (!source) return "N";
  return source
    .split(/[.@\s_-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "N";
}

export function DashboardSidebar({
  collapsed,
  onToggle,
  userEmail,
  profileName,
  profileAvatarUrl,
}: DashboardSidebarProps) {
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const displayName = profileName.trim() || userEmail || "Profile";

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!profileRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <aside className="dashboard-sidebar" aria-label="Workspace navigation">
      <div className="dashboard-sidebar-header">
        <Link href="/app" className="dashboard-sidebar-brand" aria-label="Nyabag home">
          <span className="dashboard-sidebar-logo" aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <CaretRightIcon size={17} weight="bold" /> : <CaretLeftIcon size={17} weight="bold" />}
        </button>
      </div>

      <nav className="dashboard-sidebar-scroll" aria-label="Primary">
        <div className="dashboard-sidebar-section">
          {primaryItems.map((item) => {
            const Icon = item.icon as Icon;
            const active = item.isActive(pathname);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`dashboard-sidebar-item ${active ? "active" : ""}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={20} weight="regular" />
                <span className="dashboard-sidebar-item-copy">{item.label}</span>
              </Link>
            );
          })}
        </div>

      </nav>

      <div className="dashboard-sidebar-profile" ref={profileRef}>
        {profileOpen && (
          <div className="profile-menu sidebar-profile-menu" role="menu">
            <div className="profile-menu-summary">
              <span className="profile-avatar profile-avatar-lg" aria-hidden="true">
                {profileAvatarUrl ? (
                  <span className="profile-avatar-image" style={{ backgroundImage: `url(${profileAvatarUrl})` }} />
                ) : (
                  initials(profileName, userEmail)
                )}
              </span>
              <div>
                <strong>{displayName}</strong>
                <span>{userEmail}</span>
              </div>
            </div>

            <Link href="/app/profile" className="profile-menu-item" role="menuitem" onClick={() => setProfileOpen(false)}>
              <UserIcon size={15} />
              Profile
            </Link>

            <form action={signOut}>
              <button type="submit" className="profile-menu-item profile-menu-danger" role="menuitem">
                <SignOutIcon size={15} />
                Log out
              </button>
            </form>
          </div>
        )}

        <button
          type="button"
          className="sidebar-profile-trigger"
          aria-haspopup="menu"
          aria-expanded={profileOpen}
          onClick={() => setProfileOpen((value) => !value)}
          title={collapsed ? displayName : undefined}
        >
          <span className="profile-avatar" aria-hidden="true">
            {profileAvatarUrl ? (
              <span className="profile-avatar-image" style={{ backgroundImage: `url(${profileAvatarUrl})` }} />
            ) : (
              initials(profileName, userEmail)
            )}
          </span>
          <span className="sidebar-profile-copy">
            <strong>{displayName}</strong>
            <small>{userEmail || "Personal"}</small>
          </span>
          <GearSixIcon size={17} className="sidebar-profile-settings" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
