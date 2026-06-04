"use client";

import { create } from "zustand";
import type {
  CanvasNote,
  CanvasSection,
  CanvasToolMode,
  CanvasViewport,
  NoteType,
  PendingMediaNote,
} from "@/lib/types";

type CanvasState = {
  notesById: Record<string, CanvasNote>;
  noteIds: string[];
  sectionsById: Record<string, CanvasSection>;
  sectionIds: string[];
  viewport: CanvasViewport;
  selectedIds: string[];
  toolMode: CanvasToolMode;
  activeNoteTool: NoteType | null;
  pendingMediaNote: PendingMediaNote | null;
  mediaPlacementError: string;
  isCreatingMediaNote: boolean;
  initialize: (notes: CanvasNote[], sections: CanvasSection[]) => void;
  setNotes: (notes: CanvasNote[] | ((notes: CanvasNote[]) => CanvasNote[])) => void;
  setSections: (sections: CanvasSection[] | ((sections: CanvasSection[]) => CanvasSection[])) => void;
  setViewport: (viewport: CanvasViewport) => void;
  setSelectedIds: (ids: string[]) => void;
  setToolMode: (mode: CanvasToolMode) => void;
  setActiveNoteTool: (type: NoteType | null) => void;
  setPendingMediaNote: (media: PendingMediaNote | null) => void;
  setMediaPlacementError: (message: string) => void;
  setIsCreatingMediaNote: (isCreating: boolean) => void;
};

function normalizeNotes(notes: CanvasNote[]) {
  return {
    notesById: Object.fromEntries(notes.map((note) => [note.id, note])),
    noteIds: notes.map((note) => note.id),
  };
}

function normalizeSections(sections: CanvasSection[]) {
  return {
    sectionsById: Object.fromEntries(sections.map((section) => [section.id, section])),
    sectionIds: sections.map((section) => section.id),
  };
}

function readNotes(state: CanvasState) {
  return state.noteIds.map((id) => state.notesById[id]).filter(Boolean);
}

function readSections(state: CanvasState) {
  return state.sectionIds.map((id) => state.sectionsById[id]).filter(Boolean);
}

export const useCanvasStore = create<CanvasState>((set) => ({
  notesById: {},
  noteIds: [],
  sectionsById: {},
  sectionIds: [],
  viewport: { x: 0, y: 0, scale: 1 },
  selectedIds: [],
  toolMode: "select",
  activeNoteTool: null,
  pendingMediaNote: null,
  mediaPlacementError: "",
  isCreatingMediaNote: false,
  initialize: (notes, sections) => set({ ...normalizeNotes(notes), ...normalizeSections(sections) }),
  setNotes: (next) =>
    set((state) => normalizeNotes(typeof next === "function" ? next(readNotes(state)) : next)),
  setSections: (next) =>
    set((state) => normalizeSections(typeof next === "function" ? next(readSections(state)) : next)),
  // Viewport is isolated in the store so panning/zooming can be consumed independently.
  setViewport: (viewport) => set({ viewport }),
  setSelectedIds: (ids) => set({ selectedIds: [...new Set(ids)] }),
  setToolMode: (toolMode) => set({ toolMode }),
  setActiveNoteTool: (activeNoteTool) => set({ activeNoteTool }),
  setPendingMediaNote: (pendingMediaNote) => set({ pendingMediaNote }),
  setMediaPlacementError: (mediaPlacementError) => set({ mediaPlacementError }),
  setIsCreatingMediaNote: (isCreatingMediaNote) => set({ isCreatingMediaNote }),
}));

export const canvasStoreSelectors = {
  notes: (state: CanvasState) => readNotes(state),
  sections: (state: CanvasState) => readSections(state),
  viewport: (state: CanvasState) => state.viewport,
  selectedIds: (state: CanvasState) => state.selectedIds,
  toolState: (state: CanvasState) => ({
    toolMode: state.toolMode,
    activeNoteTool: state.activeNoteTool,
    pendingMediaNote: state.pendingMediaNote,
  }),
};
