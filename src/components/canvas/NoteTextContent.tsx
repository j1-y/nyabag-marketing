"use client";

import { useRef, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import type { CanvasNote } from "@/lib/types";

export function NoteTextContent({ note, isSelected }: { note: CanvasNote; isSelected: boolean }) {
  const { updateContent } = useNotes();
  const [draft, setDraft] = useState(note.content);
  const draftRef = useRef(note.content);
  const savedRef = useRef(note.content);

  async function saveDraft() {
    const text = draftRef.current;
    if (text === savedRef.current) return;

    savedRef.current = text;
    const result = await updateContent(note.id, text);
    if (!result.success) {
      savedRef.current = note.content;
      draftRef.current = note.content;
      setDraft(note.content);
    }
  }

  return (
    <textarea
      key={`${note.id}:${note.content}`}
      value={draft}
      readOnly={!isSelected}
      aria-label="Note text"
      placeholder={isSelected ? "Start typing..." : "Click to edit..."}
      onChange={(e) => {
        draftRef.current = e.target.value;
        setDraft(e.target.value);
      }}
      onBlur={saveDraft}
      onPointerDown={(e) => isSelected && e.stopPropagation()}
      className="note-textarea"
    />
  );
}
