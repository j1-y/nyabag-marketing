"use client";

import { NotesProvider } from "@/hooks/useNotes";
import { CanvasContainer } from "./CanvasContainer";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasStatusBar } from "./CanvasStatusBar";
import type { CanvasNote } from "@/lib/types";

export function CanvasBoard({
  initialNotes,
}: {
  initialNotes: CanvasNote[];
  userEmail: string;
}) {
  return (
    <NotesProvider initial={initialNotes}>
      <div className="canvas-page">
        <CanvasContainer />
        <CanvasToolbar />
        <CanvasStatusBar />
      </div>
    </NotesProvider>
  );
}
