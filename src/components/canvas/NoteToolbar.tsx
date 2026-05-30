"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useNotes } from "@/hooks/useNotes";
import { ColorPicker } from "./ColorPicker";
import type { CanvasNote } from "@/lib/types";

interface Props {
  note: CanvasNote;
  isVisible: boolean;
}

export function NoteToolbar({ note, isVisible }: Props) {
  const { deleteNote, updateContent } = useNotes();

  return (
    <div
      className="note-toolbar"
      style={{ opacity: isVisible ? 1 : 0 }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <ColorPicker
        value={note.color}
        onChange={(color) => updateContent(note.id, note.content, color)}
      />
      <button
        className="note-toolbar-btn"
        title="Delete note"
        onPointerDown={(e) => { e.stopPropagation(); deleteNote(note.id); }}
      >
        <TrashIcon size={12} />
      </button>
    </div>
  );
}
