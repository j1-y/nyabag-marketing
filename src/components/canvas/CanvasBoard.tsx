"use client";

import { LogOut, StickyNote } from "lucide-react";
import { NotesProvider } from "@/hooks/useNotes";
import { CanvasContainer } from "./CanvasContainer";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasStatusBar } from "./CanvasStatusBar";
import { signOut } from "@/lib/actions";
import type { CanvasNote } from "@/lib/types";
import { FeatureSwitch } from "@/components/layout/FeatureSwitch";

function CanvasTopbar({ userEmail }: { userEmail: string }) {
  return (
    <header className="topbar">
      <div className="topbar-brand">
        <img src="/assets/logo.svg" alt="Nyabag" />
      </div>
      <div className="canvas-title">
        <StickyNote size={15} style={{ color: "var(--text3)" }} />
        <span style={{ fontWeight: 600, fontSize: 14 }}>Canvas</span>
      </div>
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

export function CanvasBoard({
  initialNotes,
  userEmail,
}: {
  initialNotes: CanvasNote[];
  userEmail: string;
}) {
  return (
    <NotesProvider initial={initialNotes}>
      <div className="app-layout no-sidebar">
        <FeatureSwitch />
        <div className="main-content" style={{ overflow: "hidden" }}>
          <CanvasTopbar userEmail={userEmail} />
          <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
            <CanvasContainer />
            <CanvasToolbar />
            <CanvasStatusBar />
          </div>
        </div>
      </div>
    </NotesProvider>
  );
}
