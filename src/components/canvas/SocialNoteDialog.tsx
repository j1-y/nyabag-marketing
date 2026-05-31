"use client";

import { useEffect, useState } from "react";
import { ShareNetworkIcon, XIcon } from "@phosphor-icons/react";
import { parseSocialEmbed, socialProviderLabel } from "@/lib/social-embeds";
import type { ActionResult } from "@/lib/types";

export function SocialNoteDialog({
  initialUrl = "",
  title = "Embed social post",
  description = "Paste a public Facebook, LinkedIn, or X post link.",
  confirmLabel = "Create note",
  onClose,
  onConfirm,
}: {
  initialUrl?: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (url: string) => Promise<ActionResult<unknown>>;
}) {
  const [url, setUrl] = useState(initialUrl);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const parsed = parseSocialEmbed(url);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function confirm() {
    setError("");
    if (!parsed) {
      setError("Paste a public Facebook, LinkedIn, or X post URL.");
      return;
    }

    setIsSubmitting(true);
    const result = await onConfirm(parsed.url);
    setIsSubmitting(false);
    if (result.success) onClose();
    else setError(result.error);
  }

  return (
    <div className="social-note-dialog-backdrop" onPointerDown={onClose}>
      <div
        className="social-note-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="social-note-dialog-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="social-note-dialog-header">
          <div className="social-note-dialog-icon" aria-hidden="true">
            <ShareNetworkIcon size={18} />
          </div>
          <div>
            <h2 id="social-note-dialog-title">{title}</h2>
            <p>{description}</p>
          </div>
          <button type="button" aria-label="Close" onClick={onClose}>
            <XIcon size={14} weight="bold" />
          </button>
        </div>

        <label className="social-note-url-field">
          <span>Post link</span>
          <input
            autoFocus
            type="url"
            placeholder="https://..."
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirm();
            }}
          />
        </label>

        {parsed && (
          <p className="social-note-detected">
            Detected {socialProviderLabel(parsed.provider)}
          </p>
        )}
        {error && <p className="social-note-dialog-error">{error}</p>}

        <div className="social-note-dialog-actions">
          <button type="button" onClick={onClose}>
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
