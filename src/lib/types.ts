export type Bookmark = {
  id: string;
  user_id: string;
  url: string;
  title: string;
  tags: string[];
  palette: string[];
  fonts: string[];
  screenshot_url: string | null;
  screenshot_path: string | null;
  screenshot_refreshed_at: string | null;
  summary: string;
  metadata_refreshed_at: string | null;
  note: string;
  processing_status: "ready" | "processing" | "failed";
  processing_error: string | null;
  enrichment_started_at: string | null;
  enrichment_finished_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export type ImportBookmarkItemResult = {
  url: string;
  success: boolean;
  bookmark?: Bookmark;
  error?: string;
};

export type ImportBookmarksResult = {
  created: Bookmark[];
  failed: ImportBookmarkItemResult[];
  skipped: ImportBookmarkItemResult[];
  total: number;
};

export type UserProfile = {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  avatar_path: string | null;
  avatar_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type NoteType = "text" | "text_frame" | "link" | "image" | "video" | "social";
export type NoteMediaSource = "url" | "upload";
export type NoteContentFormat = "plain" | "rich";
export type CanvasToolMode = "select" | "pan";

export type PendingMediaNote = {
  type: "image" | "video";
  source: "upload" | "url";
  file?: File;
  url?: string;
};

export type CanvasSection = {
  id: string;
  user_id: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  z_index: number;
  created_at: string;
  updated_at: string;
};

export type CanvasNote = {
  id: string;
  user_id: string;
  section_id: string | null;
  type: NoteType;
  content: string;
  content_json?: unknown | null;
  content_format?: NoteContentFormat | string;
  media_source: NoteMediaSource | null;
  media_path: string | null;
  media_mime: string | null;
  media_name: string | null;
  media_url?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  z_index: number;
  created_at: string;
  updated_at: string;
};

export type CanvasViewport = {
  x: number;
  y: number;
  scale: number;
};

export type CanvasSnapshot = {
  notes: CanvasNote[];
  sections: CanvasSection[];
};

export type DeleteNotesResult = {
  deletedIds: string[];
  removedMediaPaths: string[];
  snapshot?: CanvasSnapshot;
};
