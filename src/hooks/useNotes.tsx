"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  bringNoteToFront,
  createNote,
  deleteNote as deleteNoteAction,
  removeNoteMedia,
  updateNoteContent,
  updateNotePosition,
  updateNoteSize,
  uploadNoteMedia,
} from "@/lib/canvas-actions";
import type {
  ActionResult,
  CanvasNote,
  CanvasViewport,
  NoteMediaSource,
  NoteType,
} from "@/lib/types";

export const NOTE_COLORS = [
  "#FFF9C4",
  "#C8E6C9",
  "#BBDEFB",
  "#F8BBD0",
  "#E1BEE7",
  "#FFE0B2",
  "#F0F4C3",
  "#CFD8DC",
] as const;

interface NotesCtx {
  notes: CanvasNote[];
  viewport: CanvasViewport;
  setViewport: (v: CanvasViewport) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  addNote: (type: NoteType, canvasX: number, canvasY: number) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  updateContent: (
    id: string,
    content: string,
    color?: string,
    mediaSource?: NoteMediaSource | null
  ) => Promise<ActionResult<CanvasNote>>;
  uploadMedia: (id: string, file: File) => Promise<ActionResult<CanvasNote>>;
  removeMedia: (id: string) => Promise<ActionResult<CanvasNote>>;
  setNotePosition: (id: string, x: number, y: number) => void;
  setNoteSize: (id: string, width: number, height: number) => void;
  commitPosition: (id: string, x: number, y: number) => Promise<void>;
  commitSize: (id: string, width: number, height: number) => Promise<void>;
  bringToFront: (id: string) => void;
}

const NotesContext = createContext<NotesCtx | null>(null);

export function NotesProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial: CanvasNote[];
}) {
  const [notes, setNotes] = useState<CanvasNote[]>(initial);
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, scale: 1 });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const colorIndexRef = useRef(0);

  const addNote = useCallback(
    async (type: NoteType, canvasX: number, canvasY: number) => {
      const color = NOTE_COLORS[colorIndexRef.current % NOTE_COLORS.length];
      colorIndexRef.current++;
      const result = await createNote(type, canvasX, canvasY, color);

      if (result.success) {
        setNotes((prev) => [...prev, result.data]);
        setSelectedId(result.data.id);
      } else {
        console.error("Failed to create note:", result.error);
      }
    },
    []
  );

  const deleteNote = useCallback(async (id: string) => {
    let deleted: CanvasNote | undefined;
    setNotes((prev) => {
      deleted = prev.find((n) => n.id === id);
      return prev.filter((n) => n.id !== id);
    });
    setSelectedId((prev) => (prev === id ? null : prev));

    const result = await deleteNoteAction(id);
    if (!result.success) {
      if (deleted) setNotes((prev) => [...prev, deleted as CanvasNote]);
      console.error("Failed to delete note:", result.error);
    }
  }, []);

  const updateContent = useCallback(
    async (
      id: string,
      content: string,
      color?: string,
      mediaSource?: NoteMediaSource | null
    ) => {
      let previous: CanvasNote | undefined;
      setNotes((prev) =>
        prev.map((n) => {
          if (n.id !== id) return n;
          previous = n;
          return {
            ...n,
            content,
            ...(color ? { color } : {}),
            ...(mediaSource !== undefined
              ? {
                  media_source: mediaSource,
                  media_path: null,
                  media_mime: null,
                  media_name: null,
                  media_url: undefined,
                }
              : {}),
          };
        })
      );

      const result = await updateNoteContent(id, content, color, mediaSource);
      if (result.success) {
        setNotes((prev) => prev.map((n) => (n.id === id ? result.data : n)));
      } else if (previous) {
        setNotes((prev) => prev.map((n) => (n.id === id ? previous as CanvasNote : n)));
      }

      return result;
    },
    []
  );

  const uploadMedia = useCallback(async (id: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const result = await uploadNoteMedia(id, formData);
    if (result.success) {
      setNotes((prev) => prev.map((n) => (n.id === id ? result.data : n)));
    }

    return result;
  }, []);

  const removeMedia = useCallback(async (id: string) => {
    let previous: CanvasNote | undefined;
    setNotes((prev) =>
      prev.map((n) => {
        if (n.id !== id) return n;
        previous = n;
        return {
          ...n,
          content: "",
          media_source: null,
          media_path: null,
          media_mime: null,
          media_name: null,
          media_url: undefined,
        };
      })
    );

    const result = await removeNoteMedia(id);
    if (result.success) {
      setNotes((prev) => prev.map((n) => (n.id === id ? result.data : n)));
    } else if (previous) {
      setNotes((prev) => prev.map((n) => (n.id === id ? previous as CanvasNote : n)));
    }

    return result;
  }, []);

  const setNotePosition = useCallback((id: string, x: number, y: number) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, x, y } : n)));
  }, []);

  const setNoteSize = useCallback((id: string, width: number, height: number) => {
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, width, height } : n)));
  }, []);

  const commitPosition = useCallback(async (id: string, x: number, y: number) => {
    const result = await updateNotePosition(id, x, y);
    if (!result.success) console.error("Failed to update note position:", result.error);
  }, []);

  const commitSize = useCallback(async (id: string, width: number, height: number) => {
    const result = await updateNoteSize(id, width, height);
    if (!result.success) console.error("Failed to update note size:", result.error);
  }, []);

  const bringToFront = useCallback((id: string) => {
    setNotes((prev) => {
      const maxZ = Math.max(...prev.map((n) => n.z_index), 0);
      return prev.map((n) => (n.id === id ? { ...n, z_index: maxZ + 1 } : n));
    });

    bringNoteToFront(id).then((result) => {
      if (result.success) {
        setNotes((prev) =>
          prev.map((n) => (n.id === id ? { ...n, z_index: result.data } : n))
        );
      } else {
        console.error("Failed to bring note forward:", result.error);
      }
    });
  }, []);

  const value = useMemo<NotesCtx>(
    () => ({
      notes,
      viewport,
      setViewport,
      selectedId,
      setSelectedId,
      addNote,
      deleteNote,
      updateContent,
      uploadMedia,
      removeMedia,
      setNotePosition,
      setNoteSize,
      commitPosition,
      commitSize,
      bringToFront,
    }),
    [
      notes,
      viewport,
      selectedId,
      addNote,
      deleteNote,
      updateContent,
      uploadMedia,
      removeMedia,
      setNotePosition,
      setNoteSize,
      commitPosition,
      commitSize,
      bringToFront,
    ]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesCtx {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
