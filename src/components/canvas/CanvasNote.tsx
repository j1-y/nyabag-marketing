"use client";

import { useRef, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { ResizeHandles } from "./ResizeHandles";
import { NoteContent } from "./NoteContent";
import { NoteToolbar } from "./NoteToolbar";
import { isSocialNoteContent } from "@/lib/social-embeds";
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
  social: "Social",
};

export function CanvasNote({ note, viewport }: Props) {
  const {
    notes,
    selectedId,
    selectedIds,
    setSelectedId,
    setSelectedIds,
    setNotePosition,
    commitPosition,
    bringToFront,
  } = useNotes();
  const isSelected = selectedIds.includes(note.id);
  const isPrimarySelected = selectedId === note.id;
  const [isHovered, setIsHovered] = useState(false);
  const dragRef = useRef<{
    startPX: number;
    startPY: number;
    starts: Array<{ id: string; x: number; y: number }>;
    latest: Array<{ id: string; x: number; y: number }>;
  } | null>(null);
  const noteRef = useRef<HTMLDivElement>(null);

  function handleHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (!isSelected) setSelectedId(note.id);
    bringToFront(note.id);
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    const dragIds = isSelected ? selectedIds : [note.id];
    dragRef.current = {
      startPX: e.clientX,
      startPY: e.clientY,
      starts: notes
        .filter((candidate) => dragIds.includes(candidate.id))
        .map((candidate) => ({ id: candidate.id, x: candidate.x, y: candidate.y })),
      latest: [],
    };
    dragRef.current.latest = dragRef.current.starts;
  }

  function handleHeaderPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = (e.clientX - dragRef.current.startPX) / viewport.scale;
    const dy = (e.clientY - dragRef.current.startPY) / viewport.scale;
    const latest = dragRef.current.starts.map((start) => ({
      id: start.id,
      x: start.x + dx,
      y: start.y + dy,
    }));
    dragRef.current.latest = latest;
    latest.forEach((position) => setNotePosition(position.id, position.x, position.y));
  }

  function handleHeaderPointerUp() {
    if (!dragRef.current) return;
    dragRef.current.latest.forEach((position) => commitPosition(position.id, position.x, position.y));
    dragRef.current = null;
  }

  function handleNotePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    if (e.shiftKey) {
      setSelectedIds(
        isSelected ? selectedIds.filter((id) => id !== note.id) : [...selectedIds, note.id]
      );
      return;
    }

    if (!isSelected || selectedIds.length > 1) {
      setSelectedId(note.id);
    }
    bringToFront(note.id);
  }

  const noteLabel = isSocialNoteContent(note.content) ? "Social" : TYPE_LABELS[note.type];

  return (
    <div
      ref={noteRef}
      data-note-id={note.id}
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
        <span className="note-type-badge">{noteLabel}</span>
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
      {isPrimarySelected && <ResizeHandles note={note} viewport={viewport} />}
    </div>
  );
}
