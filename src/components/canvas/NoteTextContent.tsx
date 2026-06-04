"use client";

import { forwardRef, useCallback, useImperativeHandle, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useNotes } from "@/hooks/useNotes";
import type { CanvasNote } from "@/lib/types";

export type StickyNoteFormatAction =
  | "heading"
  | "bold"
  | "italic"
  | "underline"
  | "strike"
  | "bullet"
  | "todo"
  | "link";

export type StickyNoteTextHandle = {
  applyFormat: (action: StickyNoteFormatAction) => void;
  focus: () => void;
};

function wrapSelection(action: StickyNoteFormatAction, selected: string) {
  const text = selected || placeholderFor(action);

  switch (action) {
    case "bold":
      return `**${text}**`;
    case "italic":
      return `*${text}*`;
    case "underline":
      return `<u>${text}</u>`;
    case "strike":
      return `~~${text}~~`;
    case "link":
      return `[${selected || "link text"}](https://example.com)`;
    case "heading":
      return `## ${text}`;
    case "bullet":
      return selected
        ? selected
            .split("\n")
            .map((line) => (line.trim() ? `- ${line}` : line))
            .join("\n")
        : "- List item";
    case "todo":
      return selected
        ? selected
            .split("\n")
            .map((line) => (line.trim() ? `- [ ] ${line}` : line))
            .join("\n")
        : "- [ ] Todo item";
  }
}

function placeholderFor(action: StickyNoteFormatAction) {
  switch (action) {
    case "heading":
      return "Heading";
    case "bold":
      return "bold text";
    case "italic":
      return "italic text";
    case "underline":
      return "underlined text";
    case "strike":
      return "struck text";
    default:
      return "";
  }
}

export const NoteTextContent = forwardRef<
  StickyNoteTextHandle,
  { note: CanvasNote; isSelected: boolean }
>(function NoteTextContent({ note, isSelected }, ref) {
  const { updateContent } = useNotes();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [draftState, setDraftState] = useState({
    noteId: note.id,
    saved: note.content,
    draft: note.content,
  });
  const isFreshDraft = draftState.noteId === note.id && draftState.saved === note.content;
  const draft = isFreshDraft ? draftState.draft : note.content;

  const setDraft = useCallback((nextDraft: string) => {
    setDraftState({ noteId: note.id, saved: note.content, draft: nextDraft });
  }, [note.content, note.id]);

  useImperativeHandle(
    ref,
    () => ({
      applyFormat(action) {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = draft.slice(start, end);
        const replacement = wrapSelection(action, selected);
        const nextDraft = `${draft.slice(0, start)}${replacement}${draft.slice(end)}`;

        setDraft(nextDraft);
        requestAnimationFrame(() => {
          textarea.focus();
          const nextStart = start;
          const nextEnd = start + replacement.length;
          textarea.setSelectionRange(nextStart, nextEnd);
        });
      },
      focus() {
        textareaRef.current?.focus();
      },
    }),
    [draft, setDraft]
  );

  async function saveDraft() {
    if (draft === note.content) return;

    const previousContent = note.content;
    const result = await updateContent(note.id, draft);
    if (!result.success) {
      setDraftState({ noteId: note.id, saved: previousContent, draft: previousContent });
    }
  }

  if (!isSelected) {
    return (
      <div className="markdown-card-content">
        {note.content.trim() ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ node: _node, ...props }) => {
                void _node;
                return (
                  <a
                    {...props}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  />
                );
              },
            }}
          >
            {note.content}
          </ReactMarkdown>
        ) : (
          <p className="markdown-card-empty">
            Use Markdown: # heading, - list, - [ ] todo, **bold**
          </p>
        )}
      </div>
    );
  }

  return (
    <textarea
      ref={textareaRef}
      key={`${note.id}:${note.content}`}
      value={draft}
      aria-label="Note text"
      placeholder="Use Markdown: # heading, - list, - [ ] todo, **bold**"
      onChange={(e) => {
        setDraft(e.target.value);
      }}
      onBlur={saveDraft}
      onPointerDown={(e) => isSelected && e.stopPropagation()}
      className="note-textarea"
    />
  );
});
