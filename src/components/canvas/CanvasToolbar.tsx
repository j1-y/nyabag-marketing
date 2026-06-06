"use client";

import { useState } from "react";
import {
  CursorIcon,
  HandPalmIcon,
  ImageIcon,
  LinkSimpleIcon,
  ShareNetworkIcon,
  StickerIcon,
  TextTIcon,
  VideoCameraIcon,
  type Icon,
} from "@phosphor-icons/react";
import { useNotes } from "@/hooks/useNotes";
import { IconButton } from "@/components/ui/icon-button";
import type { NoteType } from "@/lib/types";
import { MediaNoteDialog } from "./MediaNoteDialog";
import { SocialNoteDialog } from "./SocialNoteDialog";

const NOTE_TYPES: { type: NoteType; icon: Icon; label: string; size: number }[] = [
  { type: "text", icon: StickerIcon, label: "Sticky note", size: 20 },
  { type: "text_frame", icon: TextTIcon, label: "Text frame", size: 20 },
  { type: "link", icon: LinkSimpleIcon, label: "Link note", size: 20 },
  { type: "image", icon: ImageIcon, label: "Image note", size: 20 },
  { type: "video", icon: VideoCameraIcon, label: "Video note", size: 20 },
  { type: "social", icon: ShareNetworkIcon, label: "Social post", size: 20 },
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
            <CursorIcon size={20} style={{ width: 20, height: 20 }} weight="regular" />
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
            <HandPalmIcon size={20} style={{ width: 20, height: 20 }} weight="regular" />
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
                weight="regular"
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
