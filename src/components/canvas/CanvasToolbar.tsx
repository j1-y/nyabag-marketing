"use client";

import { useRef } from "react";
import {
  CursorIcon,
  HandPalmIcon,
  ImageIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
  TextTIcon,
  VideoCameraIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useNotes } from "@/hooks/useNotes";
import type { NoteType } from "@/lib/types";

const NOTE_TYPES: { type: NoteType; icon: Icon; label: string }[] = [
  { type: "text", icon: TextTIcon, label: "Text note" },
  { type: "link", icon: LinkSimpleIcon, label: "Link note" },
  { type: "image", icon: ImageIcon, label: "Image note" },
  { type: "video", icon: VideoCameraIcon, label: "Video note" },
  { type: "social", icon: ShareNetworkIcon, label: "Social post" },
];

const NOTE_DEFAULT_SIZE: Record<NoteType, { width: number; height: number }> = {
  text: { width: 240, height: 180 },
  link: { width: 240, height: 180 },
  image: { width: 240, height: 180 },
  video: { width: 240, height: 180 },
  social: { width: 420, height: 520 },
};

export function CanvasToolbar() {
  const { addNote, viewport, toolMode, setToolMode } = useNotes();
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
    const size = NOTE_DEFAULT_SIZE[type];
    addNote(type, cx - size.width / 2, cy - size.height / 2);
  }

  return (
    <div ref={containerRef} className="canvas-toolbar">
      <div className="canvas-tool-switch" aria-label="Canvas tool mode">
        <button
          type="button"
          className={`canvas-tool-switch-btn${toolMode === "select" ? " active" : ""}`}
          title="Select notes"
          aria-label="Select notes"
          aria-pressed={toolMode === "select"}
          onClick={() => setToolMode("select")}
        >
          <CursorIcon size={22} weight="regular" />
        </button>
        <button
          type="button"
          className={`canvas-tool-switch-btn${toolMode === "pan" ? " active" : ""}`}
          title="Drag canvas"
          aria-label="Drag canvas"
          aria-pressed={toolMode === "pan"}
          onClick={() => setToolMode("pan")}
        >
          <HandPalmIcon size={22} weight="regular" />
        </button>
      </div>

      <div className="canvas-toolbar-sep" />

      {NOTE_TYPES.map(({ type, icon: Icon, label }) => (
        <button
          key={type}
          className="canvas-toolbar-btn"
          title={label}
          aria-label={label}
          onClick={() => addNoteAtCenter(type)}
        >
          <Icon size={20} weight="regular" />
        </button>
      ))}

    </div>
  );
}
