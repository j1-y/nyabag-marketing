"use client";

import { memo, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowSquareOutIcon,
  ImageIcon,
  PencilSimpleIcon,
  SpinnerIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { retryBookmarkProcessing } from "@/lib/actions";
import { getDomain, getFaviconUrl } from "@/lib/data";
import type { Bookmark } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AIMetadataChip } from "./AIMetadataChip";
import { DeleteBookmarkDialog } from "./DeleteBookmarkDialog";

function BookmarkCardComponent({
  bookmark,
  index,
  onEdit,
  onDelete,
}: {
  bookmark: Bookmark;
  index: number;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [imageState, setImageState] = useState({
    src: bookmark.screenshot_url,
    loaded: false,
    error: false,
  });
  const [faviconError, setFaviconError] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const [retryError, setRetryError] = useState("");
  const [isRetrying, startRetryTransition] = useTransition();
  const cardRef = useRef<HTMLElement>(null);

  const domain = getDomain(bookmark.url);
  const favicon = getFaviconUrl(bookmark.url);
  const screenshot = bookmark.screenshot_url;
  const imageLoaded = imageState.src === screenshot && imageState.loaded;
  const imageError = imageState.src === screenshot && imageState.error;
  const isImageLoading = Boolean(screenshot && !imageError && !imageLoaded);
  const isQueued = bookmark.processing_status === "queued";
  const isProcessing = bookmark.processing_status === "processing";
  const isPendingPreview = isQueued || isProcessing;
  const isFailed = bookmark.processing_status === "failed";
  const pendingLabel = isQueued ? "Queued for preview" : "Preparing preview...";
  const aiPageType =
    bookmark.ai_metadata?.status === "completed" && bookmark.ai_metadata.page_type
      ? bookmark.ai_metadata.page_type
      : "";

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteOpen(true);
  }

  function handleRetry(e: React.MouseEvent) {
    e.stopPropagation();
    setRetryError("");
    startRetryTransition(async () => {
      const result = await retryBookmarkProcessing(bookmark.id);
      if (result.success) router.refresh();
      else setRetryError(result.error);
    });
  }

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    if (!("IntersectionObserver" in window)) {
      const timeout = setTimeout(() => setVisible(true), 0);
      return () => clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "160px 0px", threshold: 0.08 }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <article
        ref={cardRef}
        className={`bm-card moodboard-card ${visible ? "is-visible" : "is-pending-reveal"}`}
        style={{ animationDelay: `${index * 0.04}s` }}
        onClick={() => router.push(`/app/bookmarks/${bookmark.id}`)}
        aria-label={bookmark.title}
      >
        <div className="moodboard-shot">
          <div className="moodboard-shot-frame">
            {screenshot && !imageError ? (
              <>
                {isImageLoading && (
                  <div className="preview-loading-skeleton" aria-hidden="true">
                    <div className="preview-loading-browser">
                      <span />
                      <span />
                      <span />
                    </div>
                    <div className="preview-loading-body">
                      <div className="preview-loading-line preview-loading-line-sm" />
                      <div className="preview-loading-hero" />
                      <div className="preview-loading-line" />
                      <div className="preview-loading-line preview-loading-line-mid" />
                    </div>
                    <div className="skeleton-preview-status">
                      <SpinnerIcon />
                      <span>Loading preview...</span>
                    </div>
                  </div>
                )}
                <img
                  className={`moodboard-img ${imageLoaded ? "is-loaded" : "is-loading"}`}
                  key={screenshot}
                  src={screenshot}
                  alt={`${bookmark.title} preview`}
                  loading="lazy"
                  decoding="async"
                  onLoad={() => setImageState({ src: screenshot, loaded: true, error: false })}
                  onError={() => setImageState({ src: screenshot, loaded: false, error: true })}
                />
              </>
            ) : isPendingPreview ? (
              <div className="preview-fallback">
                <ImageIcon />
                <span>{pendingLabel}</span>
              </div>
            ) : isFailed ? (
              <div className="preview-fallback">
                <ImageIcon />
                <span>Preview failed</span>
                <button
                  type="button"
                  className="preview-retry-btn"
                  onClick={handleRetry}
                  disabled={isRetrying}
                >
                  {isRetrying ? "Retrying..." : "Retry"}
                </button>
                {retryError && <small>{retryError}</small>}
              </div>
            ) : (
              <div className="preview-fallback">
                <ImageIcon />
                <span>{domain}</span>
              </div>
            )}
          </div>

          {aiPageType && (
            <AIMetadataChip
              label={aiPageType}
              showIcon
              className="bookmark-ai-chip"
            />
          )}

          <div className="moodboard-overlay">
            <div className="moodboard-meta">
              {favicon && !faviconError ? (
                <img
                  src={favicon}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={() => setFaviconError(true)}
                />
              ) : (
                <span className="moodboard-favicon-fallback">
                  {domain.charAt(0).toUpperCase()}
                </span>
              )}
              <div>
                <h3>{bookmark.title}</h3>
                <p>{domain}</p>
              </div>
            </div>
            <div className="moodboard-actions">
              <Button
                variant="ghost" size="icon" className="moodboard-action"
                title="Open site"
                aria-label={`Open ${bookmark.title}`}
                onClick={(e) => { e.stopPropagation(); window.open(bookmark.url, "_blank", "noopener,noreferrer"); }}
              >
                <ArrowSquareOutIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="moodboard-action"
                title="Edit"
                aria-label={`Edit ${bookmark.title}`}
                onClick={(e) => { e.stopPropagation(); onEdit(bookmark); }}
              >
                <PencilSimpleIcon className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="icon" className="moodboard-action moodboard-action-danger"
                title="Delete"
                aria-label={`Delete ${bookmark.title}`}
                onClick={handleDelete}
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </article>
      <DeleteBookmarkDialog
        title={bookmark.title}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={() => onDelete(bookmark.id)}
      />
    </>
  );
}

export const BookmarkCard = memo(BookmarkCardComponent);
