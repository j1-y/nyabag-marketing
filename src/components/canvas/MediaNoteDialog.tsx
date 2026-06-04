"use client";

import { useEffect, useRef, useState } from "react";
import { FileArrowUpIcon, LinkSimpleIcon, XIcon } from "@phosphor-icons/react";
import type { PendingMediaNote } from "@/lib/types";

type MediaType = "image" | "video";
type MediaSource = "upload" | "url";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

function formatLimit(type: MediaType) {
  return type === "image" ? "10MB" : "50MB";
}

function isValidFile(type: MediaType, file: File) {
  return type === "image" ? file.type.startsWith("image/") : file.type.startsWith("video/");
}

function normalizeUrl(raw: string): string | null {
  const normalized = /^https?:\/\//i.test(raw.trim())
    ? raw.trim()
    : `https://${raw.trim()}`;

  try {
    return new URL(normalized).toString();
  } catch {
    return null;
  }
}

export function MediaNoteDialog({
  type,
  onClose,
  onConfirm,
}: {
  type: MediaType;
  onClose: () => void;
  onConfirm: (media: PendingMediaNote) => void;
}) {
  const [source, setSource] = useState<MediaSource>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accept = type === "image" ? "image/*" : "video/*";
  const title = type === "image" ? "Add image" : "Add video";
  const urlPlaceholder =
    type === "image" ? "Paste an image URL" : "Paste a YouTube, Vimeo, or video URL";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function selectFile(nextFile: File | undefined) {
    setError("");
    if (!nextFile) return;

    if (!isValidFile(type, nextFile)) {
      setFile(null);
      setError(`Please choose a ${type} file.`);
      return;
    }

    const maxBytes = type === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
    if (nextFile.size > maxBytes) {
      setFile(null);
      setError(`File must be ${formatLimit(type)} or smaller.`);
      return;
    }

    setFile(nextFile);
  }

  function confirm() {
    setError("");

    if (source === "upload") {
      if (!file) {
        setError(`Choose a ${type} file first.`);
        return;
      }
      onConfirm({ type, source: "upload", file });
      return;
    }

    const normalizedUrl = normalizeUrl(url);
    if (!normalizedUrl) {
      setError("Enter a valid URL.");
      return;
    }
    onConfirm({ type, source: "url", url: normalizedUrl });
  }

  return (
    <div className="media-note-dialog-backdrop" onPointerDown={onClose}>
      <div
        className="media-note-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-note-dialog-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="media-note-dialog-header">
          <div>
            <h2 id="media-note-dialog-title">{title}</h2>
            <p>Choose media first, then place it anywhere on the canvas.</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <XIcon size={16} weight="bold" />
          </button>
        </div>

        <div className="media-note-source-switch" aria-label="Media source">
          <button
            type="button"
            className={source === "upload" ? "active" : ""}
            onClick={() => {
              setSource("upload");
              setError("");
            }}
          >
            <FileArrowUpIcon size={16} weight="regular" />
            Upload
          </button>
          <button
            type="button"
            className={source === "url" ? "active" : ""}
            onClick={() => {
              setSource("url");
              setError("");
            }}
          >
            <LinkSimpleIcon size={16} weight="regular" />
            Link
          </button>
        </div>

        {source === "upload" ? (
          <div
            className={`media-note-dropzone${isDragging ? " dragging" : ""}${file ? " has-file" : ""}`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              selectFile(e.dataTransfer.files[0]);
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={accept}
              onChange={(e) => selectFile(e.target.files?.[0])}
            />
            <FileArrowUpIcon size={28} weight="regular" />
            <strong>{file ? file.name : `Drop a ${type} file here`}</strong>
            <span>{file ? `${Math.ceil(file.size / 1024)} KB selected` : `or choose a file, up to ${formatLimit(type)}`}</span>
            <button type="button" onClick={() => fileInputRef.current?.click()}>
              Choose file
            </button>
          </div>
        ) : (
          <label className="media-note-url-field">
            <span>Media URL</span>
            <input
              autoFocus
              type="url"
              placeholder={urlPlaceholder}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") confirm();
              }}
            />
          </label>
        )}

        {error && <p className="media-note-dialog-error">{error}</p>}

        <div className="media-note-dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={confirm}>
            Place on canvas
          </button>
        </div>
      </div>
    </div>
  );
}
