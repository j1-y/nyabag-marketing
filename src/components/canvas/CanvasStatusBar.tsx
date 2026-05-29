"use client";

import { useNotes } from "@/hooks/useNotes";

export function CanvasStatusBar() {
  const { viewport } = useNotes();
  const pct = Math.round(viewport.scale * 100);

  return (
    <div className="canvas-status-bar">
      {pct}%
    </div>
  );
}
