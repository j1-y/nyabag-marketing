"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowSquareOutIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { getXPostEmbedHtml } from "@/lib/canvas-actions";
import {
  getSocialNoteUrl,
  parseSocialEmbed,
  SOCIAL_NOTE_PREFIX,
  socialProviderLabel,
  toSocialNoteContent,
} from "@/lib/social-embeds";
import { useNotes } from "@/hooks/useNotes";
import type { CanvasNote } from "@/lib/types";

declare global {
  interface Window {
    FB?: { XFBML?: { parse: (element?: HTMLElement) => void } };
    twttr?: { widgets?: { load: (element?: HTMLElement) => void } };
  }
}

const SCRIPT_IDS = {
  x: "nyabag-x-widgets",
  facebook: "nyabag-facebook-sdk",
};

function loadScript(id: string, src: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === "true") return Promise.resolve();
  if (existing) {
    return new Promise((resolve) => {
      existing.addEventListener("load", () => resolve(), { once: true });
    });
  }

  const script = document.createElement("script");
  script.id = id;
  script.src = src;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    script.dataset.loaded = "true";
  };
  document.body.appendChild(script);
  return new Promise((resolve) => {
    script.addEventListener("load", () => resolve(), { once: true });
  });
}

function normalizeInput(raw: string) {
  const parsed = parseSocialEmbed(raw);
  return parsed?.url ?? null;
}

function SocialFallback({ url, label, message }: { url: string; label: string; message?: string }) {
  return (
    <div className="social-embed-fallback">
      <div>
        <span>{label}</span>
        <strong>{message ?? "Open the public post"}</strong>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer" onPointerDown={(e) => e.stopPropagation()}>
        Open post
        <ArrowSquareOutIcon size={13} />
      </a>
    </div>
  );
}

export function NoteSocialContent({ note, isSelected }: { note: CanvasNote; isSelected: boolean }) {
  const { updateContent } = useNotes();
  const [inputVal, setInputVal] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [status, setStatus] = useState("");
  const [xEmbed, setXEmbed] = useState<{ url: string; html: string } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const socialUrl = getSocialNoteUrl(note.content);
  const embed = useMemo(() => parseSocialEmbed(note.content), [note.content]);
  const hasEmbed = Boolean(embed) && !isEditing;
  const xHtml = embed?.provider === "x" && xEmbed?.url === embed.url ? xEmbed.html : "";

  async function commitUrl(raw: string) {
    const normalized = normalizeInput(raw);
    if (!normalized) {
      setStatus("Paste a public Facebook, LinkedIn, or X post URL.");
      return;
    }

    setStatus("");
    const result = await updateContent(note.id, toSocialNoteContent(normalized));
    if (result.success) setIsEditing(false);
    else setStatus(result.error);
  }

  useEffect(() => {
    if (!hasEmbed || !embed || embed.provider !== "x") return;
    let cancelled = false;

    getXPostEmbedHtml(embed.url).then((result) => {
      if (cancelled) return;
      if (result.success) setXEmbed({ url: embed.url, html: result.data });
      else setStatus(result.error);
    });

    return () => {
      cancelled = true;
    };
  }, [hasEmbed, embed]);

  useEffect(() => {
    if (!hasEmbed || !embed) return;

    if (embed.provider === "x" && xHtml) {
      void loadScript(SCRIPT_IDS.x, "https://platform.twitter.com/widgets.js").then(() => {
        window.twttr?.widgets?.load(containerRef.current ?? undefined);
      });
    }

    if (embed.provider === "facebook") {
      void loadScript(
        SCRIPT_IDS.facebook,
        "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v20.0"
      ).then(() => {
        window.FB?.XFBML?.parse(containerRef.current ?? undefined);
      });
    }
  }, [hasEmbed, embed, xHtml]);

  if (!hasEmbed) {
    return (
      <div className="social-note-editor" onPointerDown={(e) => e.stopPropagation()}>
        <input
          autoFocus={isSelected}
          type="url"
          placeholder="Paste Facebook, LinkedIn, or X post URL"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitUrl(inputVal);
            if (e.key === "Escape") {
              setIsEditing(false);
              setInputVal("");
            }
          }}
        />
        <button type="button" onClick={() => commitUrl(inputVal)}>
          Embed post
        </button>
        {status && <p>{status}</p>}
      </div>
    );
  }

  const label = socialProviderLabel(embed!.provider);

  return (
    <div className="social-note" onPointerDown={(e) => e.stopPropagation()}>
      <div className="social-note-frame" ref={containerRef}>
        {embed!.provider === "x" && (
          xHtml ? (
            <div dangerouslySetInnerHTML={{ __html: xHtml }} />
          ) : (
            <SocialFallback url={embed!.url} label={label} message={status || "Loading post..."} />
          )
        )}

        {embed!.provider === "facebook" && (
          <div
            className="fb-post"
            data-href={embed!.url}
            data-width="400"
            data-show-text="true"
          />
        )}

        {embed!.provider === "linkedin" && (
          embed!.iframeSrc ? (
            <iframe
              src={embed!.iframeSrc}
              title="LinkedIn embedded post"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <SocialFallback url={embed!.url} label={label} />
          )
        )}
      </div>

      <div className="social-note-actions">
        <span>{label}</span>
        <button
          type="button"
          onClick={() => {
            setInputVal(socialUrl);
            setIsEditing(true);
          }}
        >
          <PencilSimpleIcon size={12} />
          Edit
        </button>
        <button type="button" onClick={() => updateContent(note.id, SOCIAL_NOTE_PREFIX)}>
          <TrashIcon size={12} />
          Clear
        </button>
        <a href={embed!.url} target="_blank" rel="noopener noreferrer">
          <ArrowSquareOutIcon size={12} />
        </a>
      </div>
    </div>
  );
}
