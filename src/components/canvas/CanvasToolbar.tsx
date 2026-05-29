"use client";

import { useRef } from "react";
import { Type, Link, Image, Video, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { useNotes } from "@/hooks/useNotes";
import type { NoteType } from "@/lib/types";

const NOTE_TYPES: { type: NoteType; icon: typeof Type; label: string }[] = [
  { type: "text", icon: Type, label: "Text note" },
  { type: "link", icon: Link, label: "Link note" },
  { type: "image", icon: Image, label: "Image note" },
  { type: "video", icon: Video, label: "Video note" },
];

export function CanvasToolbar() {
  const { addNote, viewport, setViewport } = useNotes();
  const containerRef = useRef<HTMLDivElement>(null);

  function addNoteAtCenter(type: NoteType) {
    const wrapper = containerRef.current?.closest(".main-content")?.querySelector(".canvas-wrapper");
    let cx = 400;
    let cy = 300;
    if (wrapper) {
      const rect = wrapper.getBoundingClientRect();
      cx = (rect.width / 2 - viewport.x) / viewport.scale;
      cy = (rect.height / 2 - viewport.y) / viewport.scale;
    }
    addNote(type, cx - 120, cy - 90);
  }

  function zoom(delta: number) {
    const newScale = Math.min(4.0, Math.max(0.1, viewport.scale + delta));
    setViewport({ ...viewport, scale: newScale });
  }

  function resetView() {
    setViewport({ x: 0, y: 0, scale: 1 });
  }

  return (
    <div ref={containerRef} className="canvas-toolbar">
      {NOTE_TYPES.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          className="canvas-toolbar-btn"
          title={label}
          onClick={() => addNoteAtCenter(type)}
        >
          <Icon size={14} />
        </button>
      ))}

      <div className="canvas-toolbar-sep" />

      <button className="canvas-toolbar-btn" title="Zoom out" onClick={() => zoom(-0.1)}>
        <ZoomOut size={14} />
      </button>
      <button className="canvas-toolbar-btn" title="Reset zoom" onClick={resetView}>
        <Maximize size={14} />
      </button>
      <button className="canvas-toolbar-btn" title="Zoom in" onClick={() => zoom(0.1)}>
        <ZoomIn size={14} />
      </button>
    </div>
  );
}
