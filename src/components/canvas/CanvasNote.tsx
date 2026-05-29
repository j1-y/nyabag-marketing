"use client";

import { useEffect, useRef, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { ResizeHandles } from "./ResizeHandles";
import { NoteContent } from "./NoteContent";
import { NoteToolbar } from "./NoteToolbar";
import type { CanvasNote as CanvasNoteType, CanvasViewport } from "@/lib/types";

interface Props {
  note: CanvasNoteType;
  viewport: CanvasViewport;
}

const TYPE_LABELS: Record<string, string> = {
  text: "Text",
  link: "Link",
  image: "Image",
  video: "Video",
};

export function CanvasNote({ note, viewport }: Props) {
  const { selectedId, setSelectedId, setNotePosition, commitPosition, bringToFront, deleteNote } =
    useNotes();
  const isSelected = selectedId === note.id;
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef<{
    startPX: number;
    startPY: number;
    startNoteX: number;
    startNoteY: number;
  } | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  // Delete key handler
  useEffect(() => {
    if (!isSelected) return;
    const handle = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        deleteNote(note.id);
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  }, [isSelected, note.id, deleteNote]);

  function handleHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    setSelectedId(note.id);
    bringToFront(note.id);
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      startPX: e.clientX,
      startPY: e.clientY,
      startNoteX: note.x,
      startNoteY: note.y,
    };
  }

  function handleHeaderPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startPX) / viewport.scale;
    const dy = (e.clientY - dragRef.current.startPY) / viewport.scale;
    setNotePosition(note.id, dragRef.current.startNoteX + dx, dragRef.current.startNoteY + dy);
  }

  function handleHeaderPointerUp() {
    if (!dragRef.current) return;
    commitPosition(note.id, note.x, note.y);
    dragRef.current = null;
  }

  function handleNotePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!isSelected) {
      setSelectedId(note.id);
      bringToFront(note.id);
    }
  }

  return (
    <div
      ref={noteRef}
      className={`canvas-note${isSelected ? " canvas-note--selected" : ""}`}
      style={{
        transform: `translate(${note.x}px, ${note.y}px)`,
        width: note.width,
        height: note.height,
        background: note.color,
        zIndex: isSelected ? 9999 : note.z_index,
      }}
      onPointerDown={handleNotePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle header */}
      <div
        className="note-header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
      >
        <span className="note-type-badge">{TYPE_LABELS[note.type]}</span>
        <NoteToolbar note={note} isVisible={isHovered || isSelected} />
      </div>

      {/* Content area */}
      <div
        className="note-body"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <NoteContent note={note} isSelected={isSelected} />
      </div>

      {/* Resize handles — only when selected */}
      {isSelected && <ResizeHandles note={note} viewport={viewport} />}
    </div>
  );
}
