"use client";

import { useRef, useTransition, useState } from "react";
import { FloppyDiskIcon, XIcon } from "@phosphor-icons/react";
import { createBookmark } from "@/lib/actions";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function AddBookmarkModal() {
  const {
    addOpen,
    openAdd,
    closeAdd,
    addPendingBookmark,
    removePendingBookmark,
    setBookmarks,
  } = useBookmarks();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");
  const [urlInput, setUrlInput] = useState("");

  const domainHint = (() => {
    if (!urlInput) return "Auto-detected from URL";
    try {
      const hostname = new URL(urlInput.startsWith("http") ? urlInput : `https://${urlInput}`).hostname.replace("www.", "");
      const base = hostname.split(".")[0];
      return base.charAt(0).toUpperCase() + base.slice(1);
    } catch {
      return "Auto-detected from URL";
    }
  })();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData(formRef.current!);
    const optimisticUrl = String(fd.get("url") ?? "");
    const optimisticTitle = String(fd.get("title") ?? "").trim() || domainHint;
    const pendingId = crypto.randomUUID();

    addPendingBookmark({
      id: pendingId,
      title: optimisticTitle,
      url: optimisticUrl,
    });
    closeAdd();

    startTransition(async () => {
      const result = await createBookmark(fd);
      removePendingBookmark(pendingId);
      if (result.success) {
        setBookmarks((prev) => [result.data, ...prev.filter((b) => b.id !== result.data.id)]);
        formRef.current?.reset();
        setUrlInput("");
      } else {
        setError(result.error);
        openAdd();
      }
    });
  }

  if (!addOpen) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeAdd()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-modal-title">
        <div className="modal-header">
          <h2 id="add-modal-title">Add bookmark</h2>
          <button className="modal-close" onClick={closeAdd} aria-label="Close"><XIcon size={13} weight="bold" /></button>
        </div>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="modal-body gap-4">
            {error && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}
            <div className="grid gap-2">
              <Label htmlFor="add-url">URL <span className="req text-destructive">*</span></Label>
              <Input id="add-url" name="url" type="url" placeholder="https://example.com" required autoComplete="off" value={urlInput} onChange={e => setUrlInput(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-title">Title</Label>
              <Input id="add-title" name="title" type="text" placeholder={domainHint} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-tags">Tags <span className="hint text-muted-foreground font-normal">(optional, auto-filled)</span></Label>
              <Input id="add-tags" name="tags" type="text" placeholder="Leave empty for auto tags" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="add-note">Note <span className="hint text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea id="add-note" name="note" rows={2} placeholder="Why did you save this?" className="resize-none" />
            </div>
          </div>
          <div className="modal-footer">
            <Button type="button" variant="outline" onClick={closeAdd}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              <FloppyDiskIcon /> {isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
