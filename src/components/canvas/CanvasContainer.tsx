"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { CanvasNote } from "./CanvasNote";
import { CanvasSection } from "./CanvasSection";
import type { NoteType } from "@/lib/types";

const MIN_SCALE = 0.1;
const MAX_SCALE = 4.0;
const MIN_NOTE_WIDTH = 100;
const MIN_NOTE_HEIGHT = 80;
const DRAG_CREATE_THRESHOLD = 8;

const NOTE_DEFAULT_SIZE: Record<NoteType, { width: number; height: number }> = {
  text: { width: 240, height: 180 },
  link: { width: 240, height: 180 },
  image: { width: 240, height: 180 },
  video: { width: 240, height: 180 },
  social: { width: 420, height: 520 },
};

export function CanvasContainer() {
  const {
    notes,
    sections,
    toolMode,
    activeNoteTool,
    setActiveNoteTool,
    viewport,
    setViewport,
    setSelectedId,
    setSelectedIds,
    selectedIds,
    addNote,
    deleteNotes,
    wrapSelectionInSection,
  } = useNotes();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isPlacingNoteRef = useRef(false);
  const isSpaceDownRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const selectStartRef = useRef({ x: 0, y: 0 });
  const placeStartRef = useRef({ clientX: 0, clientY: 0, canvasX: 0, canvasY: 0 });
  const viewportRef = useRef(viewport);
  const [selectionRect, setSelectionRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [placementRect, setPlacementRect] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
  const [sectionLabel, setSectionLabel] = useState("Section");

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const startPan = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setContextMenu(null);
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - viewport.x,
        y: e.clientY - viewport.y,
      };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [viewport.x, viewport.y]
  );

  const handlePointerDownCapture = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement;
      const isControl = Boolean(
        target.closest(
          "button,input,textarea,a,video,iframe,.canvas-toolbar,.canvas-zoom-controls,.note-toolbar,.color-picker-popover,.resize-handle,.canvas-section-resize"
        )
      );
      const noteEl = target.closest<HTMLElement>("[data-note-id]");
      const isSelectedNote = Boolean(noteEl?.dataset.noteId && selectedIds.includes(noteEl.dataset.noteId));
      if (activeNoteTool && e.button === 0 && !isControl) {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;
        setContextMenu(null);
        setSelectedId(null);
        isPlacingNoteRef.current = true;
        placeStartRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          canvasX: (e.clientX - rect.left - viewport.x) / viewport.scale,
          canvasY: (e.clientY - rect.top - viewport.y) / viewport.scale,
        };
        setPlacementRect({ left: e.clientX, top: e.clientY, width: 0, height: 0 });
        (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        return;
      }
      const isPanGesture =
        e.button === 1 || isSpaceDownRef.current || (toolMode === "pan" && e.button === 0);

      if (!isPanGesture || isControl || isSelectedNote) return;
      startPan(e);
    },
    [activeNoteTool, selectedIds, setSelectedId, startPan, toolMode, viewport.x, viewport.y, viewport.scale]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPlacingNoteRef.current) return;
      if (isPanningRef.current) return;
      if (e.target !== wrapperRef.current) return;
      setContextMenu(null);
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      if (e.button === 1 || isSpaceDownRef.current || toolMode === "pan") {
        startPan(e);
        return;
      }

      if (e.button !== 0) return;
      setSelectedId(null);
      isSelectingRef.current = true;
      selectStartRef.current = { x: e.clientX, y: e.clientY };
      setSelectionRect({ left: e.clientX, top: e.clientY, width: 0, height: 0 });
    },
    [startPan, toolMode, setSelectedId]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isPanningRef.current) {
        setViewport({
          ...viewport,
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        return;
      }

      if (isPlacingNoteRef.current) {
        const left = Math.min(placeStartRef.current.clientX, e.clientX);
        const top = Math.min(placeStartRef.current.clientY, e.clientY);
        const width = Math.abs(e.clientX - placeStartRef.current.clientX);
        const height = Math.abs(e.clientY - placeStartRef.current.clientY);
        setPlacementRect({ left, top, width, height });
        return;
      }

      if (isSelectingRef.current) {
        const left = Math.min(selectStartRef.current.x, e.clientX);
        const top = Math.min(selectStartRef.current.y, e.clientY);
        const width = Math.abs(e.clientX - selectStartRef.current.x);
        const height = Math.abs(e.clientY - selectStartRef.current.y);
        setSelectionRect({ left, top, width, height });
      }
    },
    [viewport, setViewport]
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
    if (isPlacingNoteRef.current && activeNoteTool) {
      const defaultSize = NOTE_DEFAULT_SIZE[activeNoteTool];
      const wrapperRect = wrapperRef.current?.getBoundingClientRect();
      const width =
        placementRect && placementRect.width >= DRAG_CREATE_THRESHOLD
          ? Math.max(MIN_NOTE_WIDTH, placementRect.width / viewport.scale)
          : defaultSize.width;
      const height =
        placementRect && placementRect.height >= DRAG_CREATE_THRESHOLD
          ? Math.max(MIN_NOTE_HEIGHT, placementRect.height / viewport.scale)
          : defaultSize.height;
      const x =
        placementRect && placementRect.width >= DRAG_CREATE_THRESHOLD && wrapperRect
          ? (placementRect.left - wrapperRect.left - viewport.x) / viewport.scale
          : placeStartRef.current.canvasX;
      const y =
        placementRect && placementRect.height >= DRAG_CREATE_THRESHOLD && wrapperRect
          ? (placementRect.top - wrapperRect.top - viewport.y) / viewport.scale
          : placeStartRef.current.canvasY;

      addNote(activeNoteTool, x, y, width, height);
      isPlacingNoteRef.current = false;
      setPlacementRect(null);
      return;
    }
    if (isSelectingRef.current && selectionRect && wrapperRef.current) {
      const rect = wrapperRef.current.getBoundingClientRect();
      const canvasLeft = (selectionRect.left - rect.left - viewport.x) / viewport.scale;
      const canvasTop = (selectionRect.top - rect.top - viewport.y) / viewport.scale;
      const canvasRight = canvasLeft + selectionRect.width / viewport.scale;
      const canvasBottom = canvasTop + selectionRect.height / viewport.scale;
      const selected = notes
        .filter((note) => {
          const noteRight = note.x + note.width;
          const noteBottom = note.y + note.height;
          return (
            note.x < canvasRight &&
            noteRight > canvasLeft &&
            note.y < canvasBottom &&
            noteBottom > canvasTop
          );
        })
        .map((note) => note.id);
      setSelectedIds(selected);
    }
    isSelectingRef.current = false;
    setSelectionRect(null);
  }, [
    activeNoteTool,
    addNote,
    notes,
    placementRect,
    selectionRect,
    setSelectedIds,
    viewport.x,
    viewport.y,
    viewport.scale,
  ]);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const prev = viewportRef.current;
      const delta = e.ctrlKey ? -e.deltaY * 0.01 : -e.deltaY * 0.002;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * (1 + delta)));
      const ratio = newScale / prev.scale;
      setViewport({
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
        scale: newScale,
      });
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [setViewport]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") isSpaceDownRef.current = true;
      if (e.key === "Escape") {
        setSelectedId(null);
        setActiveNoteTool(null);
        isPlacingNoteRef.current = false;
        setPlacementRect(null);
        setContextMenu(null);
        setIsSectionDialogOpen(false);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const target = e.target as HTMLElement;
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteNotes(selectedIds);
        }
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") isSpaceDownRef.current = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [deleteNotes, selectedIds, setActiveNoteTool, setSelectedId]);

  function handleContextMenu(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    const noteEl = (e.target as HTMLElement).closest<HTMLElement>("[data-note-id]");
    const noteId = noteEl?.dataset.noteId;
    if (noteId && !selectedIds.includes(noteId)) {
      setSelectedId(noteId);
    }
    if (noteId || selectedIds.length > 0) {
      setContextMenu({ x: e.clientX, y: e.clientY });
    } else {
      setContextMenu(null);
    }
  }

  async function submitSection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const result = await wrapSelectionInSection(sectionLabel);
    setIsSectionDialogOpen(false);
    setContextMenu(null);
    if (result.success) setSectionLabel("Section");
  }

  const { x, y, scale } = viewport;
  const bgX = ((x % 24) + 24) % 24;
  const bgY = ((y % 24) + 24) % 24;

  return (
    <div
      ref={wrapperRef}
      className={`canvas-wrapper canvas-wrapper--${toolMode}${activeNoteTool ? " canvas-wrapper--placing" : ""}`}
      style={
        {
          "--canvas-x": `${x}px`,
          "--canvas-y": `${y}px`,
          "--canvas-bg-x": `${bgX}px`,
          "--canvas-bg-y": `${bgY}px`,
        } as React.CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={handleContextMenu}
    >
      {notes.length === 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text3)",
            fontSize: 14,
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          Click a note type below to add your first note
        </div>
      )}
      <div
        className="canvas-world"
        style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
      >
        {sections.map((section) => (
          <CanvasSection key={section.id} section={section} viewport={viewport} />
        ))}
        {notes.map((note) => (
          <CanvasNote key={note.id} note={note} viewport={viewport} />
        ))}
      </div>
      {selectionRect && (
        <div
          className="canvas-selection-marquee"
          style={{
            left: selectionRect.left,
            top: selectionRect.top,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}
      {placementRect && (
        <div
          className="canvas-placement-preview"
          style={{
            left: placementRect.left,
            top: placementRect.top,
            width: placementRect.width,
            height: placementRect.height,
          }}
        />
      )}
      {contextMenu && (
        <div className="canvas-context-menu" style={{ left: contextMenu.x, top: contextMenu.y }}>
          <button
            type="button"
            onClick={() => {
              setIsSectionDialogOpen(true);
              setContextMenu(null);
            }}
            disabled={selectedIds.length === 0}
          >
            Wrap in new section
          </button>
        </div>
      )}
      {isSectionDialogOpen && (
        <div className="section-dialog-backdrop" onPointerDown={() => setIsSectionDialogOpen(false)}>
          <form
            className="section-dialog"
            onSubmit={submitSection}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <label htmlFor="section-label">Section label</label>
            <input
              id="section-label"
              value={sectionLabel}
              autoFocus
              onChange={(e) => setSectionLabel(e.target.value)}
              placeholder="Section"
            />
            <div className="section-dialog-actions">
              <button type="button" onClick={() => setIsSectionDialogOpen(false)}>
                Cancel
              </button>
              <button type="submit">Create section</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
