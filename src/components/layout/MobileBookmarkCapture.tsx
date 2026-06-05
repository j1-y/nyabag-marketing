"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircleIcon, SpinnerIcon, ArrowSquareOutIcon } from "@phosphor-icons/react";
import { createBookmark } from "@/lib/actions";

type MobileBookmarkCaptureProps = {
  profileName: string;
  userEmail: string;
};

export function MobileBookmarkCapture({ profileName, userEmail }: MobileBookmarkCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urls, setUrls] = useState("");
  const [urlCount, setUrlCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [savedCount, setSavedCount] = useState(0);
  const [isPending, startTransition] = useTransition();
  const displayName = profileName.trim() || userEmail;

  function parseUrls(raw: string): string[] {
    return raw
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setUrls(val);
    const count = parseUrls(val).length;
    setUrlCount(count);
    setErrors([]);
    setSavedCount(0);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const extracted = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.startsWith("http"));
      const appended = urls.trim()
        ? urls.trim() + "\n" + extracted.join("\n")
        : extracted.join("\n");
      setUrls(appended);
      setUrlCount(parseUrls(appended).length);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleClear() {
    setUrls("");
    setUrlCount(0);
    setErrors([]);
    setSavedCount(0);
  }

  function handleSave() {
    const list = parseUrls(urls);
    if (!list.length) return;
    setErrors([]);
    setSavedCount(0);

    startTransition(async () => {
      const results = await Promise.allSettled(
        list.map((url) => {
          const fd = new FormData();
          fd.append("url", url);
          return createBookmark(fd);
        })
      );

      const errs: string[] = [];
      let saved = 0;

      results.forEach((r, i) => {
        if (r.status === "fulfilled") {
          if (r.value.success) {
            saved++;
          } else {
            errs.push(`${list[i]}: ${r.value.error}`);
          }
        } else {
          errs.push(`${list[i]}: failed to save`);
        }
      });

      setSavedCount(saved);
      setErrors(errs);
      if (errs.length === 0) {
        setUrls("");
        setUrlCount(0);
      }
    });
  }

  return (
    <main className="mobile-capture-page">
      <section className="mobile-capture-card" aria-labelledby="mobile-capture-title">
        <div className="mobile-capture-logo" aria-hidden="true" />

        <p className="mobile-capture-kicker">Signed in as {displayName}</p>
        <h1 id="mobile-capture-title" className="mobile-capture-heading">
          Drop your links.
        </h1>
        <p className="mobile-capture-description">
          Paste URLs below or import a file — they&apos;ll be waiting on your desktop.
        </p>

        <div className="mobile-capture-textarea-wrap">
          <div className="mobile-capture-textarea-label">URLs</div>
          <textarea
            className="mobile-capture-textarea"
            value={urls}
            onChange={handleTextChange}
            placeholder={"https://example.com\nhttps://another-site.com\nhttps://one-more.io"}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            rows={6}
            disabled={isPending}
          />
          <div className="mobile-capture-textarea-footer">
            <span className={urlCount > 0 ? "mobile-capture-count active" : "mobile-capture-count"}>
              {urlCount > 0 ? `${urlCount} URL${urlCount === 1 ? "" : "s"}` : "one per line"}
            </span>
          </div>
        </div>

        <div className="mobile-capture-divider">
          <span className="mobile-capture-divider-line" />
          <span className="mobile-capture-divider-text">or import</span>
          <span className="mobile-capture-divider-line" />
        </div>

        <button
          className="mobile-capture-file-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPending}
          type="button"
        >
          <span className="mobile-capture-file-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="12" y1="18" x2="12" y2="12"/>
              <line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
          </span>
          <span className="mobile-capture-file-copy">
            <span className="mobile-capture-file-title">Upload a file</span>
            <span className="mobile-capture-file-hint">TXT, CSV or Markdown</span>
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".txt,.csv,.md"
          onChange={handleFile}
          style={{ display: "none" }}
        />

        <div className="mobile-capture-actions">
          <button
            className="mobile-capture-save-btn"
            onClick={handleSave}
            disabled={isPending || urlCount === 0}
            type="button"
          >
            {isPending ? (
              <SpinnerIcon size={16} style={{ animation: "spin 1s linear infinite" }} />
            ) : (
              <ArrowSquareOutIcon size={16} />
            )}
            {isPending ? "Saving…" : "Save to bookmarks"}
          </button>
          <button
            className="mobile-capture-clear-btn"
            onClick={handleClear}
            disabled={isPending}
            type="button"
            aria-label="Clear"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {savedCount > 0 && (
          <div className="mobile-capture-success" role="status">
            <CheckCircleIcon size={16} weight="fill" />
            {savedCount} bookmark{savedCount === 1 ? "" : "s"} saved — ready on your desktop.
          </div>
        )}

        {errors.length > 0 && (
          <div className="mobile-capture-error" role="alert">
            <p>{errors.length} URL{errors.length === 1 ? "" : "s"} failed to save:</p>
            <ul>
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}