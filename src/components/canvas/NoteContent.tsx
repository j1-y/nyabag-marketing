import { NoteTextContent } from "./NoteTextContent";
import { NoteLinkContent } from "./NoteLinkContent";
import { NoteImageContent } from "./NoteImageContent";
import { NoteVideoContent } from "./NoteVideoContent";
import type { CanvasNote } from "@/lib/types";

export function NoteContent({ note, isSelected }: { note: CanvasNote; isSelected: boolean }) {
  switch (note.type) {
    case "text":
      return <NoteTextContent note={note} isSelected={isSelected} />;
    case "link":
      return <NoteLinkContent note={note} isSelected={isSelected} />;
    case "image":
      return <NoteImageContent note={note} isSelected={isSelected} />;
    case "video":
      return <NoteVideoContent note={note} isSelected={isSelected} />;
  }
}
