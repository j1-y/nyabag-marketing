"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useNotes } from "@/hooks/useNotes";
import { IconButton } from "@/components/ui/icon-button";
import type { CanvasNote } from "@/lib/types";

interface SocialNoteToolbarProps {
  note: CanvasNote;
  viewportScale: number;
  placement: "above" | "below";
}

export function SocialNoteToolbar({ note, viewportScale, placement }: SocialNoteToolbarProps) {
  const { deleteNote } = useNotes();
  const inverseScale = viewportScale > 0 ? 1 / viewportScale : 1;

  return (
    <div
      className={`social-note-toolbar social-note-toolbar--${placement}`}
      style={{ "--sticky-toolbar-scale": inverseScale } as React.CSSProperties}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <IconButton
        type="button"
        variant="ghost"
        size="icon-sm"
        className="social-note-toolbar-button social-note-toolbar-button--delete"
        title="Delete note"
        aria-label="Delete note"
        onPointerDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
          void deleteNote(note.id);
        }}
      >
        <TrashIcon size={16} />
      </IconButton>
    </div>
  );
}
