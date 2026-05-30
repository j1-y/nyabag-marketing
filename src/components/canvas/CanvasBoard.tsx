"use client";

import { NotesProvider } from "@/hooks/useNotes";
import { CanvasContainer } from "./CanvasContainer";
import { CanvasToolbar } from "./CanvasToolbar";
import { CanvasStatusBar } from "./CanvasStatusBar";
import type { CanvasNote, CanvasSection } from "@/lib/types";

export function CanvasBoard({
  initialNotes,
  initialSections,
}: {
  initialNotes: CanvasNote[];
  initialSections: CanvasSection[];
  userEmail: string;
}) {
  return (
    <NotesProvider initial={initialNotes} initialSections={initialSections}>
      <div className="canvas-page">
        <CanvasContainer />
        <CanvasToolbar />
        <CanvasStatusBar />
      </div>
    </NotesProvider>
  );
}
