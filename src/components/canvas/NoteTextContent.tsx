"use client";

import { useRef } from "react";
import { useNotes } from "@/hooks/useNotes";
import type { CanvasNote } from "@/lib/types";

export function NoteTextContent({ note, isSelected }: { note: CanvasNote; isSelected: boolean }) {
  const { updateContent } = useNotes();
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      contentEditable={isSelected}
      suppressContentEditableWarning
      onBlur={(e) => {
        const text = e.currentTarget.textContent ?? "";
        if (text !== note.content) updateContent(note.id, text);
      }}
      onPointerDown={(e) => isSelected && e.stopPropagation()}
      style={{
        height: "100%",
        padding: "10px 12px",
        outline: "none",
        fontSize: 14,
        lineHeight: 1.6,
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        cursor: isSelected ? "text" : "default",
        overflowY: "auto",
      }}
    >
      {note.content || (isSelected ? "" : <span style={{ color: "var(--text3)", fontStyle: "italic" }}>Click to edit…</span>)}
    </div>
  );
}
