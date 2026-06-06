"use client";

import { useRef, useState, useTransition } from "react";
import { CheckIcon } from "@phosphor-icons/react";
import { updateBookmark } from "@/lib/actions";
import { useBookmarks } from "@/hooks/useBookmarks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldHint, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function EditBookmarkModal() {
  const { editTarget, closeEdit, setBookmarks } = useBookmarks();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      const result = await updateBookmark(fd);
      if (result.success) {
        setBookmarks((prev) => prev.map((bookmark) => bookmark.id === result.data.id ? result.data : bookmark));
        closeEdit();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={Boolean(editTarget)} onOpenChange={(open) => !open && closeEdit()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit bookmark</DialogTitle>
          <DialogDescription>
            Update the saved reference details without changing the original URL history.
          </DialogDescription>
        </DialogHeader>
        {editTarget && (
          <form ref={formRef} onSubmit={handleSubmit}>
            <input type="hidden" name="id" value={editTarget.id} />
            <div className="grid gap-4 px-4 py-4">
              {error && <div className="auth-error">{error}</div>}
              <Field>
                <FieldLabel htmlFor="edit-url">URL <span className="text-destructive">*</span></FieldLabel>
                <Input id="edit-url" name="url" type="url" defaultValue={editTarget.url} required autoComplete="off" />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-title">Title</FieldLabel>
                <Input id="edit-title" name="title" type="text" defaultValue={editTarget.title} />
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-tags">Tags</FieldLabel>
                <Input id="edit-tags" name="tags" type="text" defaultValue={editTarget.tags.join(", ")} />
                <FieldHint>Comma-separated.</FieldHint>
              </Field>
              <Field>
                <FieldLabel htmlFor="edit-note">Note</FieldLabel>
                <Textarea id="edit-note" name="note" rows={2} defaultValue={editTarget.note} className="resize-none" />
                <FieldHint>Optional.</FieldHint>
              </Field>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeEdit}>Cancel</Button>
              <Button type="submit" disabled={isPending}>
                <CheckIcon /> {isPending ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
