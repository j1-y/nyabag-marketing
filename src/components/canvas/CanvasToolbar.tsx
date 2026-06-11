"use client";

import { MousePointer2, Hand, Image, Share2, Sticker, Type, Video, Link as LinkIcon } from "lucide-react";
import { useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import { IconButton } from "@/components/ui/icon-button";
import type { NoteType } from "@/lib/types";
import type { LucideIcon } from "lucide-react";
import { MediaNoteDialog } from "./MediaNoteDialog";
import { SocialNoteDialog } from "./SocialNoteDialog";

const NOTE_TYPES: { type: NoteType; icon: LucideIcon; label: string; size: number }[] = [
  { type: "text", icon: Sticker, label: "Sticky note", size: 20 },
  { type: "text_frame", icon: Type, label: "Text frame", size: 20 },
  { type: "link", icon: LinkIcon, label: "Link note", size: 20 },
  { type: "image", icon: Image, label: "Image note", size: 20 },
  { type: "video", icon: Video, label: "Video note", size: 20 },
  { type: "social", icon: Share2, label: "Social post", size: 20 },
];

export function CanvasToolbar() {
  const {
    toolMode,
    setToolMode,
    activeNoteTool,
    setActiveNoteTool,
    pendingMediaNote,
    setPendingMediaNote,
    createSocialNote,
  } = useNotes();
  const [mediaDialogType, setMediaDialogType] = useState<"image" | "video" | null>(null);
  const [socialDialogOpen, setSocialDialogOpen] = useState(false);

  return (
    <>
      <div className="canvas-toolbar">
        <div className="canvas-tool-switch" aria-label="Canvas tool mode">
          <IconButton
            type="button"
            variant="ghost"
            size="icon"
            className={`canvas-tool-switch-btn${toolMode === "select" ? " active" : ""}`}
            title="Select notes"
            aria-label="Select notes"
            aria-pressed={toolMode === "select"}
            onClick={() => {
              setToolMode("select");
              setActiveNoteTool(null);
              setPendingMediaNote(null);
            }}
          >
            <MousePointer2 size={20} style={{ width: 20, height: 20 }} />
          </IconButton>
          <IconButton
            type="button"
            variant="ghost"
            size="icon"
            className={`canvas-tool-switch-btn${toolMode === "pan" ? " active" : ""}`}
            title="Drag canvas"
            aria-label="Drag canvas"
            aria-pressed={toolMode === "pan"}
            onClick={() => {
              setToolMode("pan");
              setActiveNoteTool(null);
              setPendingMediaNote(null);
            }}
          >
            <Hand size={20} style={{ width: 20, height: 20 }} />
          </IconButton>
        </div>

        <div className="canvas-toolbar-sep" />

        {NOTE_TYPES.map(({ type, icon: Icon, label, size }) => {
          const isMediaTool = type === "image" || type === "video";
          const isActive = activeNoteTool === type || pendingMediaNote?.type === type || (type === "social" && socialDialogOpen);

          return (
            <IconButton
              key={type}
              type="button"
              variant="ghost"
              size="icon"
              className={`canvas-toolbar-btn${isActive ? " active" : ""}`}
              title={label}
              aria-label={label}
              aria-pressed={isActive}
              onClick={() => {
                if (isMediaTool) {
                  setMediaDialogType(type);
                  setActiveNoteTool(null);
                  setPendingMediaNote(null);
                  setToolMode("select");
                  return;
                }

                if (type === "social") {
                  setSocialDialogOpen(true);
                  setPendingMediaNote(null);
                  setActiveNoteTool(null);
                  setToolMode("select");
                  return;
                }

                setPendingMediaNote(null);
                setActiveNoteTool(activeNoteTool === type ? null : type);
                setToolMode("select");
              }}
            >
              <Icon
                size={size}
                style={{ width: size, height: size }}
              />
            </IconButton>
          );
        })}
      </div>

      {mediaDialogType && (
        <MediaNoteDialog
          type={mediaDialogType}
          onClose={() => setMediaDialogType(null)}
          onConfirm={(media) => {
            setPendingMediaNote(media);
            setMediaDialogType(null);
          }}
        />
      )}

      {socialDialogOpen && (
        <SocialNoteDialog
          onClose={() => setSocialDialogOpen(false)}
          onConfirm={createSocialNote}
        />
      )}
    </>
  );
}
