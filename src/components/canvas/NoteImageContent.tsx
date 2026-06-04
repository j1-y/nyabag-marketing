"use client";

import { useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import type { CanvasNote } from "@/lib/types";

export function NoteImageContent({ note, isSelected }: { note: CanvasNote; isSelected: boolean }) {
  const { updateContent, uploadMedia, removeMedia } = useNotes();
  const [inputVal, setInputVal] = useState("");
  const [imgError, setImgError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");

  const imageUrl =
    note.media_source === "upload"
      ? note.media_url
      : note.media_source === "url" || note.content.startsWith("http")
        ? note.content
        : "";
  const hasImage = Boolean(imageUrl) && !imgError && !isEditing;

  async function commitUrl(raw: string) {
    const url = raw.trim();
    if (!url) return;

    setStatus("");
    setImgError(false);
    const result = await updateContent(note.id, url, undefined, "url");
    if (result.success) {
      setInputVal("");
      setIsEditing(false);
    } else {
      setStatus(result.error);
    }
  }

  async function handleFileChange(file: File | undefined) {
    if (!file) return;

    setStatus("Uploading...");
    setImgError(false);
    const result = await uploadMedia(note.id, file);
    if (result.success) {
      setInputVal("");
      setIsEditing(false);
      setStatus("");
    } else {
      setStatus(result.error);
    }
  }

  async function clearMedia() {
    setStatus("");
    const result = await removeMedia(note.id);
    if (!result.success) setStatus(result.error);
  }

  if (!hasImage) {
    return (
      <div
        className="image-note-editor"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          autoFocus={isSelected && !note.content && !note.media_path}
          type="url"
          className="image-note-url-input"
          placeholder="Paste image URL and press Enter"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitUrl(inputVal);
            if (e.key === "Escape") {
              setIsEditing(false);
              setInputVal("");
              setStatus("");
              setImgError(false);
            }
          }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          className="image-note-file-input"
        />
        {(imgError || status) && (
          <p className="image-note-status">{status || "Could not load image. Try another URL or upload a file."}</p>
        )}
        {isSelected && (note.content || note.media_path) && (
          <button
            onClick={clearMedia}
            className="image-note-clear-inline"
          >
            Clear image
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className="image-note-content"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <img
        className="image-note-media"
        src={imageUrl}
        alt={note.media_name ?? ""}
        loading="lazy"
        decoding="async"
        onError={() => setImgError(true)}
      />
    </div>
  );
}
