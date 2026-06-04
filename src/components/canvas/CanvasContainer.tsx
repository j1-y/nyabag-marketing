"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { CanvasNote } from "./CanvasNote";
import { CanvasSection } from "./CanvasSection";
import { maybeSnap } from "@/lib/canvas-grid";
import type { NoteType } from "@/lib/types";

const MIN_SCALE = 0.1;
const MAX_SCALE = 4.0;
const MIN_NOTE_WIDTH = 100;
const MIN_NOTE_HEIGHT = 80;
const DRAG_CREATE_THRESHOLD = 8;
const WHEEL_LINE_HEIGHT = 16;

const NOTE_DEFAULT_SIZE: Record<NoteType, { width: number; height: number }> = {
  text: { width: 240, height: 180 },
  link: { width: 240, height: 180 },
  image: { width: 240, height: 180 },
  video: { width: 240, height: 180 },
  social: { width: 240, height: 180 },
};

export function CanvasContainer() {
  const {
    notes,
    sections,
    toolMode,
    setToolMode,
    activeNoteTool,
    setActiveNoteTool,
    pendingMediaNote,
    setPendingMediaNote,
    isCreatingMediaNote,
    mediaPlacementError,
    viewport,
    setViewport,
    setSelectedId,
    setSelectedIds,
    selectedIds,
    addNote,
    addMediaNote,
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
  const lastPlacementAltKeyRef = useRef(false);
  const viewportRef = useRef(viewport);
  const viewportFrameRef = useRef<number | null>(null);
  const nextViewportRef = useRef(viewport);
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
  const [isPanning, setIsPanning] = useState(false);

  useEffect(() => {
    viewportRef.current = viewport;
    nextViewportRef.current = viewport;
  }, [viewport]);

  useEffect(
    () => () => {
      if (viewportFrameRef.current !== null) cancelAnimationFrame(viewportFrameRef.current);
    },
    []
  );

  const scheduleViewport = useCallback(
    (nextViewport: typeof viewport) => {
      nextViewportRef.current = nextViewport;
      viewportRef.current = nextViewport;
      if (viewportFrameRef.current !== null) return;
      viewportFrameRef.current = requestAnimationFrame(() => {
        viewportFrameRef.current = null;
        setViewport(nextViewportRef.current);
      });
    },
    [setViewport]
  );

  const handleCanvasWheel = useCallback(
    (e: WheelEvent, allowPan: boolean) => {
      const el = wrapperRef.current;
      if (!el) return;

      const prev = viewportRef.current;
      const deltaFactor =
        e.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? WHEEL_LINE_HEIGHT
          : e.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? el.clientHeight
            : 1;

      if (!e.ctrlKey) {
        if (!allowPan) return;
        if (e.cancelable) e.preventDefault();
        scheduleViewport({
          ...prev,
          x: prev.x - e.deltaX * deltaFactor,
          y: prev.y - e.deltaY * deltaFactor,
        });
        return;
      }

      if (e.cancelable) e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const zoomFactor = Math.exp(-e.deltaY * deltaFactor * 0.002);
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * zoomFactor));
      const ratio = newScale / prev.scale;
      scheduleViewport({
        x: mouseX - (mouseX - prev.x) * ratio,
        y: mouseY - (mouseY - prev.y) * ratio,
        scale: newScale,
      });
    },
    [scheduleViewport]
  );

  const startPan = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setContextMenu(null);
      isPanningRef.current = true;
      setIsPanning(true);
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
          "button,input,textarea,a,video,iframe,.canvas-toolbar,.canvas-zoom-controls,.note-toolbar,.sticky-note-toolbar,.color-picker-popover,.resize-handle,.canvas-section-resize"
        )
      );
      const noteEl = target.closest<HTMLElement>("[data-note-id]");
      const isSelectedNote = Boolean(noteEl?.dataset.noteId && selectedIds.includes(noteEl.dataset.noteId));
      const canPlaceActiveTool =
        activeNoteTool &&
        activeNoteTool !== "social" &&
        (activeNoteTool !== "image" && activeNoteTool !== "video" || pendingMediaNote);
      if (canPlaceActiveTool && e.button === 0 && !isControl && !isCreatingMediaNote) {
        const rect = wrapperRef.current?.getBoundingClientRect();
        if (!rect) return;
        setContextMenu(null);
        setSelectedId(null);
        isPlacingNoteRef.current = true;
        lastPlacementAltKeyRef.current = e.altKey;
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
    [
      activeNoteTool,
      pendingMediaNote,
      isCreatingMediaNote,
      selectedIds,
      setSelectedId,
      startPan,
      toolMode,
      viewport.x,
      viewport.y,
      viewport.scale,
    ]
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
        scheduleViewport({
          ...viewportRef.current,
          x: e.clientX - panStartRef.current.x,
          y: e.clientY - panStartRef.current.y,
        });
        return;
      }

      if (isPlacingNoteRef.current) {
        lastPlacementAltKeyRef.current = e.altKey;
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
    [scheduleViewport]
  );

  const handlePointerUp = useCallback((e?: React.PointerEvent<HTMLDivElement>) => {
    isPanningRef.current = false;
    setIsPanning(false);
    if (isPlacingNoteRef.current && activeNoteTool) {
      const defaultSize = NOTE_DEFAULT_SIZE[activeNoteTool];
      const wrapperRect = wrapperRef.current?.getBoundingClientRect();
      const shouldSnap = !(e?.altKey ?? lastPlacementAltKeyRef.current);
      const width =
        placementRect && placementRect.width >= DRAG_CREATE_THRESHOLD
          ? Math.max(
              MIN_NOTE_WIDTH,
              maybeSnap(Math.max(MIN_NOTE_WIDTH, placementRect.width / viewport.scale), shouldSnap)
            )
          : defaultSize.width;
      const height =
        placementRect && placementRect.height >= DRAG_CREATE_THRESHOLD
          ? Math.max(
              MIN_NOTE_HEIGHT,
              maybeSnap(Math.max(MIN_NOTE_HEIGHT, placementRect.height / viewport.scale), shouldSnap)
            )
          : defaultSize.height;
      const x = placementRect && placementRect.width >= DRAG_CREATE_THRESHOLD && wrapperRect
        ? maybeSnap((placementRect.left - wrapperRect.left - viewport.x) / viewport.scale, shouldSnap)
        : maybeSnap(placeStartRef.current.canvasX, shouldSnap);
      const y =
        placementRect && placementRect.height >= DRAG_CREATE_THRESHOLD && wrapperRect
          ? maybeSnap((placementRect.top - wrapperRect.top - viewport.y) / viewport.scale, shouldSnap)
          : maybeSnap(placeStartRef.current.canvasY, shouldSnap);

      if ((activeNoteTool === "image" || activeNoteTool === "video") && pendingMediaNote) {
        addMediaNote(x, y, width, height);
      } else {
        addNote(activeNoteTool, x, y, width, height);
      }
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
    pendingMediaNote,
    addNote,
    addMediaNote,
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
      handleCanvasWheel(e, true);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleCanvasWheel]);

  useEffect(() => {
    const handleCtrlWheelCapture = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      const el = wrapperRef.current;
      if (!el) return;

      const target = e.target instanceof Node ? e.target : null;
      const rect = el.getBoundingClientRect();
      const isInsideCanvasBounds =
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom;
      const isInsideCanvas = Boolean(target && el.contains(target)) || isInsideCanvasBounds;
      if (!isInsideCanvas) return;

      e.stopPropagation();
      handleCanvasWheel(e, false);
    };

    document.addEventListener("wheel", handleCtrlWheelCapture, { passive: false, capture: true });
    return () => document.removeEventListener("wheel", handleCtrlWheelCapture, { capture: true });
  }, [handleCanvasWheel]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") isSpaceDownRef.current = true;
      const target = e.target as HTMLElement;
      const tag = target.tagName;
      const isTyping =
        tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;

      if (!isTyping && e.key.toLowerCase() === "v") {
        e.preventDefault();
        setToolMode("select");
        setActiveNoteTool(null);
      }
      if (!isTyping && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setToolMode("pan");
        setActiveNoteTool(null);
      }
      if (e.key === "Escape") {
        setSelectedId(null);
        setActiveNoteTool(null);
        setPendingMediaNote(null);
        isPlacingNoteRef.current = false;
        setPlacementRect(null);
        setContextMenu(null);
        setIsSectionDialogOpen(false);
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (isTyping) return;
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
  }, [deleteNotes, selectedIds, setActiveNoteTool, setPendingMediaNote, setSelectedId, setToolMode]);

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
      className={`canvas-wrapper canvas-wrapper--${toolMode}${isPanning ? " canvas-wrapper--panning" : ""}${activeNoteTool ? " canvas-wrapper--placing" : ""}`}
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
      onPointerCancel={handlePointerUp}
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
      {isCreatingMediaNote && (
        <div className="canvas-creation-status" role="status">
          Creating media note...
        </div>
      )}
      {!isCreatingMediaNote && mediaPlacementError && (
        <div className="canvas-creation-status canvas-creation-status--error" role="alert">
          {mediaPlacementError}
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
