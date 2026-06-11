"use client";

import { Type, Trash2, Link as LinkIcon } from "lucide-react";
import type { CSSProperties, RefObject } from "react";
import { useNotes } from "@/hooks/useNotes";
import { IconButton } from "@/components/ui/icon-button";
import type { CanvasNote } from "@/lib/types";
import type { StickyNoteFormatAction, StickyNoteTextHandle } from "./NoteTextContent";
import type { LucideIcon } from "lucide-react";

interface TextFrameToolbarProps {
  note: CanvasNote;
  formatRef: RefObject<StickyNoteTextHandle | null>;
  viewportScale: number;
  placement: "above" | "below";
}

const FRAME_ACTIONS: Array<{
  action: StickyNoteFormatAction;
  label: string;
  title: string;
  icon?: LucideIcon;
}> = [
  { action: "heading", label: "H", title: "Heading", icon: Type },
  { action: "bold", label: "B", title: "Bold" },
  { action: "italic", label: "I", title: "Italic" },
  { action: "underline", label: "U", title: "Underline" },
  { action: "link", label: "Link", title: "Link", icon: LinkIcon },
];

export function TextFrameToolbar({
  note,
  formatRef,
  viewportScale,
  placement,
}: TextFrameToolbarProps) {
  const { deleteNote } = useNotes();
  const inverseScale = viewportScale > 0 ? 1 / viewportScale : 1;

  return (
    <div
      className={`text-frame-toolbar text-frame-toolbar--${placement}`}
      style={{ "--sticky-toolbar-scale": inverseScale } as CSSProperties}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {FRAME_ACTIONS.map(({ action, label, title, icon: Icon }) => (
        <button
          key={action}
          type="button"
          className={`text-frame-toolbar-button text-frame-toolbar-button--${action}`}
          title={title}
          aria-label={title}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            formatRef.current?.applyFormat(action);
          }}
        >
          {Icon ? <Icon size={16} /> : label}
        </button>
      ))}

      <div className="text-frame-toolbar-sep" />

      <IconButton
        type="button"
        variant="ghost"
        size="icon-sm"
        className="text-frame-toolbar-button text-frame-toolbar-button--delete"
        title="Delete text frame"
        aria-label="Delete text frame"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          void deleteNote(note.id);
        }}
      >
        <Trash2 size={16} />
      </IconButton>
    </div>
  );
}
