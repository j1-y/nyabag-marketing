"use client";

import {
  CheckSquareIcon,
  LinkSimpleIcon,
  ListBulletsIcon,
  TextTIcon,
} from "@phosphor-icons/react";
import type { CSSProperties, ReactNode, RefObject } from "react";
import { NOTE_COLORS, useNotes } from "@/hooks/useNotes";
import type { StickyNoteFormatAction, StickyNoteTextHandle } from "./NoteTextContent";
import type { CanvasNote } from "@/lib/types";

interface StickyNoteToolbarProps {
  note: CanvasNote;
  formatRef: RefObject<StickyNoteTextHandle | null>;
  viewportScale: number;
  placement: "above" | "below";
}

const FORMAT_BUTTONS: Array<{
  action: StickyNoteFormatAction;
  label: string;
  title: string;
  icon?: ReactNode;
}> = [
  { action: "heading", label: "H", title: "Heading", icon: <TextTIcon size={16} /> },
  { action: "bold", label: "B", title: "Bold" },
  { action: "italic", label: "I", title: "Italic" },
  { action: "underline", label: "U", title: "Underline" },
  { action: "strike", label: "S", title: "Strikethrough" },
  { action: "bullet", label: "List", title: "Bulleted list", icon: <ListBulletsIcon size={16} /> },
  { action: "todo", label: "Todo", title: "Todo list", icon: <CheckSquareIcon size={16} /> },
  { action: "link", label: "Link", title: "Link", icon: <LinkSimpleIcon size={16} /> },
];

export function StickyNoteToolbar({
  note,
  formatRef,
  viewportScale,
  placement,
}: StickyNoteToolbarProps) {
  const { updateContent } = useNotes();
  const inverseScale = viewportScale > 0 ? 1 / viewportScale : 1;

  function applyFormat(action: StickyNoteFormatAction) {
    formatRef.current?.applyFormat(action);
  }

  return (
    <div
      className={`sticky-note-toolbar sticky-note-toolbar--${placement}`}
      style={{ "--sticky-toolbar-scale": inverseScale } as CSSProperties}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="sticky-note-color-group" aria-label="Sticky note color">
        {NOTE_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            className={`sticky-note-color-swatch${
              note.color.toLowerCase() === color.toLowerCase() ? " active" : ""
            }`}
            style={{ background: color }}
            title={`Set color ${color}`}
            aria-label={`Set note color ${color}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              updateContent(note.id, note.content, color);
              formatRef.current?.focus();
            }}
          />
        ))}
      </div>

      <div className="sticky-note-toolbar-sep" />

      {FORMAT_BUTTONS.map((button) => (
        <button
          key={button.action}
          type="button"
          className={`sticky-note-toolbar-button sticky-note-toolbar-button--${button.action}`}
          title={button.title}
          aria-label={button.title}
          onPointerDown={(e) => {
            e.stopPropagation();
            e.preventDefault();
            applyFormat(button.action);
          }}
        >
          {button.icon ?? button.label}
        </button>
      ))}
    </div>
  );
}
