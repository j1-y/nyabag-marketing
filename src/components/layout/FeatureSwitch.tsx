"use client";

import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { NoteIcon, SpinnerIcon, SquaresFourIcon } from "@phosphor-icons/react";

function FeatureSwitchLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={`feature-switch-item ${active ? "active" : ""}`}>
      <FeatureSwitchLinkInner>{children}</FeatureSwitchLinkInner>
    </Link>
  );
}

function FeatureSwitchLinkInner({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();

  return (
    <>
      <span className="feature-switch-copy">{children}</span>
      {pending && <SpinnerIcon className="feature-switch-spinner" size={13} weight="bold" aria-hidden="true" />}
    </>
  );
}

export function FeatureSwitch() {
  const pathname = usePathname();
  const isNotes = pathname.startsWith("/app/canvas");

  return (
    <nav className="feature-switch" aria-label="Primary">
      <FeatureSwitchLink href="/app" active={!isNotes}>
        <SquaresFourIcon size={14} weight="bold" />
        Bookmarks
      </FeatureSwitchLink>
      <FeatureSwitchLink href="/app/canvas" active={isNotes}>
        <NoteIcon size={14} weight="bold" />
        Canvas
      </FeatureSwitchLink>
    </nav>
  );
}
