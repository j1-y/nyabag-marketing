"use client";

import { useRef, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { ResizeHandles } from "./ResizeHandles";
import { NoteContent } from "./NoteContent";
import { NoteToolbar } from "./NoteToolbar";
import { StickyNoteToolbar } from "./StickyNoteToolbar";
import { maybeSnap } from "@/lib/canvas-grid";
import { isSocialNoteContent } from "@/lib/social-embeds";
import type { StickyNoteTextHandle } from "./NoteTextContent";
import type { CanvasNote as CanvasNoteType, CanvasViewport } from "@/lib/types";

interface Props {
  note: CanvasNoteType;
  viewport: CanvasViewport;
}

const TYPE_LABELS: Record<string, string> = {
  text: "Markdown",
  link: "Link",
  image: "Image",
  video: "Video",
  social: "Social",
};

const LIGHT_TEXT_COLORS = new Set(["#EF4056", "#B23ACB"]);

function getNoteInk(color: string) {
  return LIGHT_TEXT_COLORS.has(color.toUpperCase()) ? "#FFFFFF" : "#111111";
}

export function CanvasNote({ note, viewport }: Props) {
  const {
    notes,
    selectedId,
    selectedIds,
    setSelectedId,
    setSelectedIds,
    setNotePositions,
    commitPosition,
    bringToFront,
    toolMode,
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
  const dragFrameRef = useRef<number | null>(null);
  const pendingPositionsRef = useRef<Array<{ id: string; x: number; y: number }>>([]);
  const noteRef = useRef<HTMLDivElement>(null);
  const textFormatRef = useRef<StickyNoteTextHandle | null>(null);

  function schedulePositions(positions: Array<{ id: string; x: number; y: number }>) {
    pendingPositionsRef.current = positions;
    if (dragFrameRef.current !== null) return;
    dragFrameRef.current = requestAnimationFrame(() => {
      dragFrameRef.current = null;
      setNotePositions(pendingPositionsRef.current);
    });
  }

  function handleHeaderPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (toolMode === "pan" && !isSelected) return;
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
    const shouldSnap = !e.altKey;
    const anchor = dragRef.current.starts[0];
    const nextAnchorX = maybeSnap(anchor.x + dx, shouldSnap);
    const nextAnchorY = maybeSnap(anchor.y + dy, shouldSnap);
    const snappedDx = nextAnchorX - anchor.x;
    const snappedDy = nextAnchorY - anchor.y;
    const latest = dragRef.current.starts.map((start) => ({
      id: start.id,
      x: start.x + snappedDx,
      y: start.y + snappedDy,
    }));
    dragRef.current.latest = latest;
    schedulePositions(latest);
  }

  function handleHeaderPointerUp() {
    if (!dragRef.current) return;
    if (dragFrameRef.current !== null) {
      cancelAnimationFrame(dragFrameRef.current);
      dragFrameRef.current = null;
      setNotePositions(dragRef.current.latest);
    }
    dragRef.current.latest.forEach((position) => commitPosition(position.id, position.x, position.y));
    dragRef.current = null;
  }

  function handleNotePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (toolMode === "pan" && !isSelected) return;
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
  const isTextNote = note.type === "text" && !isSocialNoteContent(note.content);
  const showStickyToolbar = isPrimarySelected && isTextNote && selectedIds.length === 1;
  const toolbarPlacement = viewport.y + note.y * viewport.scale > 64 ? "above" : "below";

  return (
    <div
      ref={noteRef}
      data-note-id={note.id}
      className={`canvas-note${isTextNote ? " canvas-note--text" : ""}${
        isSelected ? " canvas-note--selected" : ""
      }`}
      style={{
        transform: `translate(${note.x}px, ${note.y}px)`,
        width: note.width,
        height: note.height,
        background: note.color,
        color: getNoteInk(note.color),
        "--sticky-note-ink": getNoteInk(note.color),
        zIndex: isSelected ? 9999 : note.z_index,
      } as React.CSSProperties}
      onPointerDown={handleNotePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drag handle header */}
      <div
        className={`note-header${isTextNote ? " note-header--text" : ""}`}
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
      >
        <span className="note-type-badge">{noteLabel}</span>
        {!isTextNote && <NoteToolbar note={note} isVisible={isHovered || isSelected} />}
      </div>

      {/* Content area */}
      <div
        className="note-body"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <NoteContent note={note} isSelected={isSelected} textFormatRef={textFormatRef} />
      </div>

      {/* Resize handles — only when selected */}
      {showStickyToolbar && (
        <StickyNoteToolbar
          note={note}
          formatRef={textFormatRef}
          viewportScale={viewport.scale}
          placement={toolbarPlacement}
        />
      )}

      {isPrimarySelected && <ResizeHandles note={note} viewport={viewport} />}
    </div>
  );
}
