"use client";

import { useCallback, useEffect, useRef } from "react";
import { useNotes } from "@/hooks/useNotes";
import { CanvasNote } from "./CanvasNote";

const MIN_SCALE = 0.1;
const MAX_SCALE = 4.0;

export function CanvasContainer() {
  const { notes, viewport, setViewport, setSelectedId } = useNotes();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewportRef = useRef(viewport);

  // Keep viewport ref in sync for wheel handler
  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  // Pan handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.target !== wrapperRef.current) return;
      setSelectedId(null);
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - viewport.x,
        y: e.clientY - viewport.y,
      };
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    },
    [viewport.x, viewport.y, setSelectedId]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      setViewport({
        ...viewport,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    },
    [viewport, setViewport]
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Zoom via wheel — must be non-passive to call preventDefault
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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setSelectedId]);

  const { x, y, scale } = viewport;

  return (
    <div
      ref={wrapperRef}
      className="canvas-wrapper"
      style={
        {
          "--canvas-x": `${x}px`,
          "--canvas-y": `${y}px`,
          "--canvas-scale": scale,
        } as React.CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
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
        {notes.map((note) => (
          <CanvasNote key={note.id} note={note} viewport={viewport} />
        ))}
      </div>
    </div>
  );
}
