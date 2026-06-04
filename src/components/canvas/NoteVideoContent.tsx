"use client";

import { useState } from "react";
import { useNotes } from "@/hooks/useNotes";
import type { CanvasNote } from "@/lib/types";

function getVideoEmbed(url: string): { src: string; platform: "youtube" | "vimeo" } | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return { src: `https://www.youtube.com/embed/${id}`, platform: "youtube" };
    }
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("?")[0];
      if (id) return { src: `https://www.youtube.com/embed/${id}`, platform: "youtube" };
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (id) return { src: `https://player.vimeo.com/video/${id}`, platform: "vimeo" };
    }
    return null;
  } catch {
    return null;
  }
}

export function NoteVideoContent({ note, isSelected }: { note: CanvasNote; isSelected: boolean }) {
  const { updateContent, uploadMedia, removeMedia } = useNotes();
  const [inputVal, setInputVal] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");

  const uploadedVideoUrl = note.media_source === "upload" ? note.media_url : "";
  const embed = note.media_source !== "upload" && note.content ? getVideoEmbed(note.content) : null;
  const hasVideo = (Boolean(uploadedVideoUrl) || Boolean(embed)) && !isEditing;

  async function commitUrl(raw: string) {
    const url = raw.trim();
    if (!url) return;

    setStatus("");
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

  if (!hasVideo) {
    return (
      <div
        style={{ padding: "10px 12px", height: "100%", display: "flex", flexDirection: "column", gap: 8 }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <input
          autoFocus={isSelected && !note.content && !note.media_path}
          type="url"
          placeholder="Paste YouTube or Vimeo URL"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitUrl(inputVal);
            if (e.key === "Escape") {
              setIsEditing(false);
              setInputVal("");
              setStatus("");
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
          accept="video/*"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          style={{ width: "100%", fontSize: 12, color: "var(--text2)" }}
        />
        {(status || (note.content && !embed && note.media_source !== "upload")) && (
          <p style={{ fontSize: 12, color: "var(--text3)", margin: 0 }}>
            {status || "Unsupported URL. Try YouTube, Vimeo, or upload a video file."}
          </p>
        )}
        {isSelected && (note.content || note.media_path) && (
          <button
            onClick={clearMedia}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text3)", fontSize: 11, textAlign: "left", padding: 0 }}
          >
            Clear video
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ height: "100%", position: "relative", background: "#000" }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {uploadedVideoUrl ? (
        <video
          src={uploadedVideoUrl}
          controls
          preload="metadata"
          style={{ width: "100%", height: "100%", display: "block", objectFit: "contain" }}
        />
      ) : (
        <iframe
          src={embed?.src}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        />
      )}
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
