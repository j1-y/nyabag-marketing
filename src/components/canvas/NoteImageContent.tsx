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
        style={{ padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 8 }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          autoFocus={isSelected && !note.content && !note.media_path}
          type="url"
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
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: 10,
            border: "1px solid var(--border2)",
            background: "var(--bg)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          style={{ width: "100%", fontSize: 12, color: "var(--text2)" }}
        />
        {(imgError || status) && (
          <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>{status || "Could not load image. Try another URL or upload a file."}</p>
        )}
        {isSelected && (note.content || note.media_path) && (
          <button
            onClick={clearMedia}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, textAlign: "left", padding: 0 }}
          >
            Clear image
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ height: "100%", position: "relative", overflow: "hidden" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <img
        src={imageUrl}
        alt={note.media_name ?? ""}
        loading="lazy"
        decoding="async"
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={() => setImgError(true)}
      />
      {isSelected && (
        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              setIsEditing(true);
              setInputVal(note.media_source === "url" ? note.content : "");
            }}
            style={{
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "3px 8px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Change
          </button>
          <button
            onClick={clearMedia}
            style={{
              background: "rgba(0,0,0,0.6)",
              color: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "3px 8px",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
