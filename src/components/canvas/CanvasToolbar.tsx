"use client";

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

export function CanvasToolbar() {
  const { toolMode, setToolMode, activeNoteTool, setActiveNoteTool } = useNotes();

  return (
    <div className="canvas-toolbar">
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
          className={`canvas-toolbar-btn${activeNoteTool === type ? " active" : ""}`}
          title={label}
          aria-label={label}
          aria-pressed={activeNoteTool === type}
          onClick={() => {
            setActiveNoteTool(activeNoteTool === type ? null : type);
            setToolMode("select");
          }}
        >
          <Icon size={20} weight="regular" />
        </button>
      ))}

    </div>
  );
}
