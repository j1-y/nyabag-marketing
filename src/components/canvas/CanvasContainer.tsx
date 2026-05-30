"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { CanvasNote } from "./CanvasNote";
import { CanvasSection } from "./CanvasSection";

const MIN_SCALE = 0.1;
const MAX_SCALE = 4.0;

export function CanvasContainer() {
  const {
    notes,
    sections,
    toolMode,
    viewport,
    setViewport,
    setSelectedId,
    setSelectedIds,
    selectedIds,
    deleteNotes,
    wrapSelectionInSection,
  } = useNotes();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const isSelectingRef = useRef(false);
  const isSpaceDownRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const selectStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(viewport);
  const [selectionRect, setSelectionRect] = useState<{
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

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target !== wrapperRef.current) return;
      setContextMenu(null);
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);

      if (e.button === 1 || isSpaceDownRef.current || toolMode === "pan") {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX - viewport.x,
          y: e.clientY - viewport.y,
        };
        return;
      }

      if (e.button !== 0) return;
      setSelectedId(null);
      isSelectingRef.current = true;
      selectStartRef.current = { x: e.clientX, y: e.clientY };
      setSelectionRect({ left: e.clientX, top: e.clientY, width: 0, height: 0 });
    },
    [toolMode, viewport.x, viewport.y, setSelectedId]
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
  }, [notes, selectionRect, setSelectedIds, viewport.x, viewport.y, viewport.scale]);

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
  }, [deleteNotes, selectedIds, setSelectedId]);

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
      className={`canvas-wrapper canvas-wrapper--${toolMode}`}
      style={
        {
          "--canvas-x": `${x}px`,
          "--canvas-y": `${y}px`,
          "--canvas-bg-x": `${bgX}px`,
          "--canvas-bg-y": `${bgY}px`,
        } as React.CSSProperties
      }
      onPointerDown={handlePointerDown}
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
