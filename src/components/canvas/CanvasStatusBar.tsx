"use client";

import { ArrowsOutSimpleIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { useNotes } from "@/hooks/useNotes";

export function CanvasStatusBar() {
  const { viewport, setViewport } = useNotes();
  const pct = Math.round(viewport.scale * 100);

  function zoom(delta: number) {
    const newScale = Math.min(4.0, Math.max(0.1, viewport.scale + delta));
    setViewport({ ...viewport, scale: newScale });
  }

  function resetView() {
    setViewport({ x: 0, y: 0, scale: 1 });
  }

  return (
    <div className="canvas-zoom-controls">
      <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => zoom(-0.1)}>
        <MinusIcon size={18} weight="regular" />
      </button>
      <button type="button" title="Reset zoom" aria-label={`Reset zoom, current ${pct}%`} onClick={resetView}>
        <ArrowsOutSimpleIcon size={17} weight="regular" />
      </button>
      <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => zoom(0.1)}>
        <PlusIcon size={18} weight="regular" />
      </button>
    </div>
  );
}
