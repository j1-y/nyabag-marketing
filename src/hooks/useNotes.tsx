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
  createMediaNoteFromUrl,
  createMediaNoteWithUpload,
  createSectionFromNotes,
  createNote,
  deleteSection as deleteSectionAction,
  deleteNote as deleteNoteAction,
  deleteNotes as deleteNotesAction,
  removeNoteMedia,
  updateSectionLabel,
  updateSectionPosition,
  updateSectionSize,
  updateNoteContent,
  updateNotePosition,
  updateNoteSize,
  uploadNoteMedia,
} from "@/lib/canvas-actions";
import type {
  ActionResult,
  CanvasNote,
  CanvasSection,
  CanvasToolMode,
  CanvasViewport,
  NoteMediaSource,
  NoteType,
} from "@/lib/types";

export type PendingMediaNote = {
  type: "image" | "video";
  source: "upload" | "url";
  file?: File;
  url?: string;
};

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
  sections: CanvasSection[];
  toolMode: CanvasToolMode;
  setToolMode: (mode: CanvasToolMode) => void;
  activeNoteTool: NoteType | null;
  setActiveNoteTool: (type: NoteType | null) => void;
  pendingMediaNote: PendingMediaNote | null;
  setPendingMediaNote: (media: PendingMediaNote | null) => void;
  isCreatingMediaNote: boolean;
  mediaPlacementError: string;
  viewport: CanvasViewport;
  setViewport: (v: CanvasViewport) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  addNote: (
    type: NoteType,
    canvasX: number,
    canvasY: number,
    width?: number,
    height?: number
  ) => Promise<void>;
  addMediaNote: (
    canvasX: number,
    canvasY: number,
    width?: number,
    height?: number
  ) => Promise<ActionResult<CanvasNote>>;
  deleteNote: (id: string) => Promise<void>;
  deleteNotes: (ids: string[]) => Promise<void>;
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
  wrapSelectionInSection: (label: string) => Promise<ActionResult<CanvasSection>>;
  setSectionPosition: (id: string, x: number, y: number) => void;
  setSectionSize: (id: string, width: number, height: number) => void;
  commitSectionPosition: (id: string, x: number, y: number) => Promise<void>;
  commitSectionSize: (id: string, width: number, height: number) => Promise<void>;
  renameSection: (id: string, label: string) => Promise<ActionResult<CanvasSection>>;
  deleteSection: (id: string) => Promise<void>;
}

const NotesContext = createContext<NotesCtx | null>(null);

export function NotesProvider({
  children,
  initial,
  initialSections,
}: {
  children: React.ReactNode;
  initial: CanvasNote[];
  initialSections: CanvasSection[];
}) {
  const [notes, setNotes] = useState<CanvasNote[]>(initial);
  const [sections, setSections] = useState<CanvasSection[]>(initialSections);
  const [toolMode, setToolMode] = useState<CanvasToolMode>("select");
  const [activeNoteTool, setActiveNoteToolState] = useState<NoteType | null>(null);
  const [pendingMediaNote, setPendingMediaNoteState] = useState<PendingMediaNote | null>(null);
  const [isCreatingMediaNote, setIsCreatingMediaNote] = useState(false);
  const [mediaPlacementError, setMediaPlacementError] = useState("");
  const [viewport, setViewport] = useState<CanvasViewport>({ x: 0, y: 0, scale: 1 });
  const [selectedIds, setSelectedIdsState] = useState<string[]>([]);
  const colorIndexRef = useRef(0);
  const selectedId = selectedIds.length === 1 ? selectedIds[0] : null;

  const setSelectedIds = useCallback((ids: string[]) => {
    setSelectedIdsState([...new Set(ids)]);
  }, []);

  const setSelectedId = useCallback(
    (id: string | null) => {
      setSelectedIds(id ? [id] : []);
    },
    [setSelectedIds]
  );

  const setActiveNoteTool = useCallback((type: NoteType | null) => {
    setActiveNoteToolState(type);
    if (!type || (type !== "image" && type !== "video")) {
      setPendingMediaNoteState(null);
      setMediaPlacementError("");
    }
  }, []);

  const setPendingMediaNote = useCallback((media: PendingMediaNote | null) => {
    setPendingMediaNoteState(media);
    setActiveNoteToolState(media?.type ?? null);
    setMediaPlacementError("");
    if (media) setToolMode("select");
  }, []);

  const addNote = useCallback(
    async (type: NoteType, canvasX: number, canvasY: number, width?: number, height?: number) => {
      const color = NOTE_COLORS[colorIndexRef.current % NOTE_COLORS.length];
      colorIndexRef.current++;
      const result = await createNote(type, canvasX, canvasY, color, width, height);

      if (result.success) {
        setNotes((prev) => [...prev, result.data]);
        setSelectedId(result.data.id);
        setActiveNoteToolState(null);
      } else {
        console.error("Failed to create note:", result.error);
      }
    },
    [setSelectedId]
  );

  const addMediaNote = useCallback(
    async (
      canvasX: number,
      canvasY: number,
      width?: number,
      height?: number
    ): Promise<ActionResult<CanvasNote>> => {
      if (!pendingMediaNote) {
        return { success: false, error: "Choose media before placing the note" };
      }

      const color = NOTE_COLORS[colorIndexRef.current % NOTE_COLORS.length];
      colorIndexRef.current++;
      setIsCreatingMediaNote(true);
      setMediaPlacementError("");

      let result: ActionResult<CanvasNote>;
      try {
        result =
          pendingMediaNote.source === "upload"
            ? await (async () => {
                if (!pendingMediaNote.file) {
                  return { success: false, error: "No file was selected" } as ActionResult<CanvasNote>;
                }
                const formData = new FormData();
                formData.append("file", pendingMediaNote.file);
                return createMediaNoteWithUpload(
                  pendingMediaNote.type,
                  formData,
                  canvasX,
                  canvasY,
                  color,
                  width,
                  height
                );
              })()
            : await createMediaNoteFromUrl(
                pendingMediaNote.type,
                pendingMediaNote.url ?? "",
                canvasX,
                canvasY,
                color,
                width,
                height
              );
      } catch (error) {
        result = {
          success: false,
          error: error instanceof Error ? error.message : "Failed to create media note",
        };
      } finally {
        setIsCreatingMediaNote(false);
      }
      if (result.success) {
        setNotes((prev) => [...prev, result.data]);
        setSelectedId(result.data.id);
        setPendingMediaNote(null);
      } else {
        colorIndexRef.current = Math.max(0, colorIndexRef.current - 1);
        setMediaPlacementError(result.error);
        console.error("Failed to create media note:", result.error);
      }

      return result;
    },
    [pendingMediaNote, setPendingMediaNote, setSelectedId]
  );

  const applyServerSnapshot = useCallback((snapshot: { notes: CanvasNote[]; sections: CanvasSection[] }) => {
    setNotes(snapshot.notes);
    setSections(snapshot.sections);
    const noteIds = new Set(snapshot.notes.map((note) => note.id));
    setSelectedIdsState((prev) => prev.filter((id) => noteIds.has(id)));
  }, []);

  const deleteNotes = useCallback(
    async (ids: string[]) => {
      const uniqueIds = [...new Set(ids)];
      if (uniqueIds.length === 0) return;

      setNotes((prev) => prev.filter((note) => !uniqueIds.includes(note.id)));
      setSelectedIdsState((prev) => prev.filter((selected) => !uniqueIds.includes(selected)));

      const result = await deleteNotesAction(uniqueIds);
      if (result.success) {
        applyServerSnapshot(result.data);
      } else {
        console.error("Failed to delete note:", result.error);
      }
    },
    [applyServerSnapshot]
  );

  const deleteNote = useCallback(
    async (id: string) => {
      const result = await deleteNoteAction(id);
      if (result.success) {
        applyServerSnapshot(result.data);
      } else {
        console.error("Failed to delete note:", result.error);
      }
    },
    [applyServerSnapshot]
  );

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

  const wrapSelectionInSection = useCallback(
    async (label: string): Promise<ActionResult<CanvasSection>> => {
      const noteIds = new Set(notes.map((note) => note.id));
      const ids = selectedIds.filter((id) => noteIds.has(id));
      const staleIds = selectedIds.filter((id) => !noteIds.has(id));
      if (staleIds.length > 0) {
        setSelectedIds(ids);
      }
      if (ids.length === 0) {
        return { success: false, error: "Selected notes no longer exist" };
      }

      const result = await createSectionFromNotes(label, ids);

      if (result.success) {
        setSections((prev) => [...prev, result.data.section]);
        setNotes((prev) =>
          prev
            .filter((note) => !result.data.missingNoteIds.includes(note.id))
            .map((note) => {
              const updated = result.data.notes.find((n) => n.id === note.id);
              return updated ?? note;
            })
        );
        setSelectedIds(result.data.notes.map((note) => note.id));
        return { success: true, data: result.data.section };
      }

      if (result.error === "Selected notes no longer exist") {
        setNotes((prev) => prev.filter((note) => !ids.includes(note.id)));
        setSelectedIds([]);
      } else {
        console.warn("Failed to create section:", result.error);
      }
      return result;
    },
    [notes, selectedIds, setSelectedIds]
  );

  const setSectionPosition = useCallback((id: string, x: number, y: number) => {
    setSections((prev) => prev.map((section) => (section.id === id ? { ...section, x, y } : section)));
  }, []);

  const setSectionSize = useCallback((id: string, width: number, height: number) => {
    setSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, width, height } : section))
    );
  }, []);

  const commitSectionPosition = useCallback(
    async (id: string, x: number, y: number) => {
      const memberNotes = notes
        .filter((note) => note.section_id === id)
        .map((note) => ({ id: note.id, x: note.x, y: note.y }));
      const result = await updateSectionPosition(id, x, y, memberNotes);
      if (!result.success) console.error("Failed to update section position:", result.error);
    },
    [notes]
  );

  const commitSectionSize = useCallback(async (id: string, width: number, height: number) => {
    const result = await updateSectionSize(id, width, height);
    if (result.success) {
      setSections((prev) => prev.map((section) => (section.id === id ? result.data : section)));
    } else {
      console.error("Failed to update section size:", result.error);
    }
  }, []);

  const renameSection = useCallback(async (id: string, label: string) => {
    const result = await updateSectionLabel(id, label);
    if (result.success) {
      setSections((prev) => prev.map((section) => (section.id === id ? result.data : section)));
    }
    return result;
  }, []);

  const deleteSection = useCallback(async (id: string) => {
    const previousSection = sections.find((section) => section.id === id);
    const previousNotes = notes;
    setSections((prev) => prev.filter((section) => section.id !== id));
    setNotes((prev) =>
      prev.map((note) => (note.section_id === id ? { ...note, section_id: null } : note))
    );

    const result = await deleteSectionAction(id);
    if (!result.success) {
      if (previousSection) setSections((prev) => [...prev, previousSection]);
      setNotes(previousNotes);
      console.error("Failed to delete section:", result.error);
    }
  }, [notes, sections]);

  const value = useMemo<NotesCtx>(
    () => ({
      notes,
      sections,
      toolMode,
      setToolMode,
      activeNoteTool,
      setActiveNoteTool,
      pendingMediaNote,
      setPendingMediaNote,
      isCreatingMediaNote,
      mediaPlacementError,
      viewport,
      setViewport,
      selectedId,
      setSelectedId,
      selectedIds,
      setSelectedIds,
      addNote,
      addMediaNote,
      deleteNote,
      deleteNotes,
      updateContent,
      uploadMedia,
      removeMedia,
      setNotePosition,
      setNoteSize,
      commitPosition,
      commitSize,
      bringToFront,
      wrapSelectionInSection,
      setSectionPosition,
      setSectionSize,
      commitSectionPosition,
      commitSectionSize,
      renameSection,
      deleteSection,
    }),
    [
      notes,
      sections,
      toolMode,
      activeNoteTool,
      setActiveNoteTool,
      pendingMediaNote,
      setPendingMediaNote,
      isCreatingMediaNote,
      mediaPlacementError,
      viewport,
      selectedId,
      selectedIds,
      setSelectedId,
      setSelectedIds,
      addNote,
      addMediaNote,
      deleteNote,
      deleteNotes,
      updateContent,
      uploadMedia,
      removeMedia,
      setNotePosition,
      setNoteSize,
      commitPosition,
      commitSize,
      bringToFront,
      wrapSelectionInSection,
      setSectionPosition,
      setSectionSize,
      commitSectionPosition,
      commitSectionSize,
      renameSection,
      deleteSection,
    ]
  );

  return <NotesContext.Provider value={value}>{children}</NotesContext.Provider>;
}

export function useNotes(): NotesCtx {
  const ctx = useContext(NotesContext);
  if (!ctx) throw new Error("useNotes must be used within NotesProvider");
  return ctx;
}
