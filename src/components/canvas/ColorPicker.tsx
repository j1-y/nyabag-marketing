"use client";

import { useState, useRef, useEffect } from "react";
import { Palette } from "lucide-react";
import { NOTE_COLORS } from "@/hooks/useNotes";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="note-toolbar-btn"
        title="Change color"
        onPointerDown={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <Palette size={12} />
      </button>
      {open && (
        <div className="color-picker-popover" onPointerDown={(e) => e.stopPropagation()}>
          {NOTE_COLORS.map((c) => (
            <button
              key={c}
              className={`color-swatch${value === c ? " color-swatch--active" : ""}`}
              style={{ background: c }}
              onPointerDown={(e) => { e.stopPropagation(); onChange(c); setOpen(false); }}
              title={c}
            />
          ))}
        </div>
      )}
    </div>
  );
}
