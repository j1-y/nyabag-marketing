"use client";

import { useState } from "react";
import { X, ExternalLink, Palette, Type, StickyNote, Tags, Trash2, Pencil, Image as ImageIcon, Maximize2 } from "lucide-react";
import { getDomain, getTagColor, getScreenshotUrl } from "@/lib/data";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Button } from "@/components/ui/button";
import { DeleteBookmarkDialog } from "./DeleteBookmarkDialog";

export function DetailModal() {
  const { detailTarget, closeDetail, openEdit, deleteItem } = useBookmarks();
  const [imgError, setImgError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (!detailTarget) return null;

  const b = detailTarget;
  const domain = getDomain(b.url);

  function handleDelete() {
    setDeleteOpen(true);
  }

  return (
    <>
      <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeDetail()}>
        <div className="modal modal-detail" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <div className="modal-header">
          <h2 id="detail-title">{b.title}</h2>
          <button className="modal-close" onClick={closeDetail} aria-label="Close"><X size={13} /></button>
        </div>

        <div className="relative h-[220px] bg-muted overflow-hidden border-b flex-shrink-0 group">
          <div className="absolute inset-0 overflow-y-auto">
            {!imgError ? (
              <img
                className="w-full h-auto block"
                src={getScreenshotUrl(b.url)}
                alt="Site screenshot"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="preview-fallback" style={{ position: "absolute", inset: 0, display: "flex" }}>
                <ImageIcon size={36} strokeWidth={1} />
                <span style={{ fontSize: 12, color: "var(--text3)" }}>{domain}</span>
              </div>
            )}
          </div>
          <div className="absolute bottom-2 right-2 flex gap-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="secondary" className="h-7 px-3 text-xs shadow-md" asChild>
              <a href={getScreenshotUrl(b.url)} target="_blank" rel="noopener noreferrer">
                <Maximize2 className="mr-1.5 h-3 w-3" /> Expand
              </a>
            </Button>
            <Button size="sm" variant="default" className="h-7 px-3 text-xs shadow-md" asChild>
              <a href={b.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1.5 h-3 w-3" /> Open site
              </a>
            </Button>
          </div>
        </div>

        <div className="detail-meta">
          <div className="meta-block">
            <p className="meta-label"><Palette /> Extracted colors</p>
            <div className="palette-row">
              {b.palette.map((c) => (
                <div key={c} className="palette-swatch">
                  <div className="dot" style={{ background: c }} />
                  <span>{c}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="meta-block">
            <p className="meta-label"><Type /> Detected fonts</p>
            <div className="font-row">
              {b.fonts.map((f) => <span key={f} className="font-badge">{f}</span>)}
            </div>
          </div>

          {b.note && (
            <div className="meta-block">
              <p className="meta-label"><StickyNote /> Note</p>
              <p className="meta-note">{b.note}</p>
            </div>
          )}

          <div className="meta-block">
            <p className="meta-label"><Tags /> Tags</p>
            <div className="tag-row">
              {b.tags.length ? b.tags.map((t) => (
                <span key={t} className="ctag" style={{ borderColor: `${getTagColor(t)}33`, color: getTagColor(t) }}>
                  {t}
                </span>
              )) : <span style={{ fontSize: 12, color: "var(--text3)" }}>No tags</span>}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 /> Delete
          </Button>
          <Button variant="outline" onClick={() => { closeDetail(); openEdit(b); }}>
            <Pencil /> Edit
          </Button>
          <Button asChild>
            <a href={b.url} target="_blank" rel="noopener noreferrer">
              <ExternalLink /> Visit site
            </a>
          </Button>
        </div>
        </div>
      </div>
      <DeleteBookmarkDialog
        title={b.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => deleteItem(b.id)}
      />
    </>
  );
}
