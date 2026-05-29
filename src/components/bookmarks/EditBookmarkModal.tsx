"use client";

import { useRef, useTransition } from "react";
import { X, Check } from "lucide-react";
import { updateBookmark } from "@/lib/actions";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

export function EditBookmarkModal() {
  const { editTarget, closeEdit } = useBookmarks();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const result = await updateBookmark(fd);
      if (result.success) closeEdit();
      else setError(result.error);
    });
  }

  if (!editTarget) return null;

  return (
    <div className="modal-overlay open" onClick={(e) => e.target === e.currentTarget && closeEdit()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-modal-title">
        <div className="modal-header">
          <h2 id="edit-modal-title">Edit bookmark</h2>
          <button className="modal-close" onClick={closeEdit} aria-label="Close"><X size={13} /></button>
        </div>
        <form ref={formRef} onSubmit={handleSubmit}>
          <input type="hidden" name="id" value={editTarget.id} />
          <div className="modal-body gap-4">
            {error && <div className="auth-error" style={{ marginBottom: "1rem" }}>{error}</div>}
            <div className="grid gap-2">
              <Label htmlFor="edit-url">URL <span className="req text-destructive">*</span></Label>
              <Input id="edit-url" name="url" type="url" defaultValue={editTarget.url} required autoComplete="off" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input id="edit-title" name="title" type="text" defaultValue={editTarget.title} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags <span className="hint text-muted-foreground font-normal">(comma-separated)</span></Label>
              <Input id="edit-tags" name="tags" type="text" defaultValue={editTarget.tags.join(", ")} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-note">Note <span className="hint text-muted-foreground font-normal">(optional)</span></Label>
              <Textarea id="edit-note" name="note" rows={2} defaultValue={editTarget.note} className="resize-none" />
            </div>
          </div>
          <div className="modal-footer">
            <Button type="button" variant="outline" onClick={closeEdit}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              <Check /> {isPending ? "Saving…" : "Update"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
