export type Bookmark = {
  id: string;
  user_id: string;
  url: string;
  title: string;
  tags: string[];
  palette: string[];
  fonts: string[];
  screenshot_url: string | null;
  screenshot_refreshed_at: string | null;
  summary: string;
  metadata_refreshed_at: string | null;
  note: string;
  created_at: string;
  updated_at: string;
};

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

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

export type NoteType = "text" | "link" | "image" | "video";
export type NoteMediaSource = "url" | "upload";

export type CanvasNote = {
  id: string;
  user_id: string;
  type: NoteType;
  content: string;
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
