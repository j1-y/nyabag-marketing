"use client";

import { useRef, useState, useTransition } from "react";
import { ArrowSquareOutIcon, CheckCircleIcon, SpinnerIcon } from "@phosphor-icons/react";
import { createBookmark } from "@/lib/actions";

type MobileBookmarkCaptureProps = {
  profileName: string;
  userEmail: string;
};

export function MobileBookmarkCapture({ profileName, userEmail }: MobileBookmarkCaptureProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();
  const displayName = profileName.trim() || userEmail;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    const formData = new FormData(formRef.current!);
    startTransition(async () => {
      const result = await createBookmark(formData);
      if (result.success) {
        setSuccess(`${result.data.title} was saved to your desktop bookmarks.`);
        setUrl("");
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <main className="mobile-capture-page">
      <section className="mobile-capture-card" aria-labelledby="mobile-capture-title">
        <div className="mobile-capture-logo" aria-hidden="true" />
        <p className="mobile-capture-kicker">Signed in as {displayName}</p>
        <h1 id="mobile-capture-title">Nyabag currently works best on desktop.</h1>
        <p>
          Save links from your phone now. They will be ready in your bookmarks the next time you
          open Nyabag on your computer.
        </p>

        <form ref={formRef} className="mobile-capture-form" onSubmit={handleSubmit}>
          <label htmlFor="mobile-bookmark-url">Website URL</label>
          <div className="mobile-capture-input-row">
            <input
              id="mobile-bookmark-url"
              name="url"
              type="url"
              inputMode="url"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder="https://example.com"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <button type="submit" disabled={isPending}>
              {isPending ? (
                <SpinnerIcon size={18} style={{ animation: "spin 1s linear infinite" }} />
              ) : (
                <ArrowSquareOutIcon size={18} />
              )}
              {isPending ? "Saving" : "Save"}
            </button>
          </div>
        </form>

        {success && (
          <div className="mobile-capture-success" role="status">
            <CheckCircleIcon size={18} weight="fill" />
            {success}
          </div>
        )}
        {error && (
          <div className="mobile-capture-error" role="alert">
            {error}
          </div>
        )}
      </section>
    </main>
  );
}
