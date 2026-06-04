import { NoteTextContent } from "./NoteTextContent";
import { NoteLinkContent } from "./NoteLinkContent";
import { NoteImageContent } from "./NoteImageContent";
import { NoteVideoContent } from "./NoteVideoContent";
import { NoteSocialContent } from "./NoteSocialContent";
import { isSocialNoteContent } from "@/lib/social-embeds";
import type { RefObject } from "react";
import type { CanvasNote } from "@/lib/types";
import type { StickyNoteTextHandle } from "./NoteTextContent";

export function NoteContent({
  note,
  isSelected,
  textFormatRef,
}: {
  note: CanvasNote;
  isSelected: boolean;
  textFormatRef?: RefObject<StickyNoteTextHandle | null>;
}) {
  if (note.type === "social" || isSocialNoteContent(note.content)) {
    return <NoteSocialContent note={note} isSelected={isSelected} />;
  }

  switch (note.type) {
    case "text":
      return <NoteTextContent ref={textFormatRef} note={note} isSelected={isSelected} />;
    case "link":
      return <NoteLinkContent note={note} isSelected={isSelected} />;
    case "image":
      return <NoteImageContent note={note} isSelected={isSelected} />;
    case "video":
      return <NoteVideoContent note={note} isSelected={isSelected} />;
  }
}
