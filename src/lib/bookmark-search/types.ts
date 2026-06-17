import type { Bookmark } from "@/lib/types";

export type BookmarkSearchMode = "exact" | "hybrid" | "keyword" | "semantic";

export type BookmarkSearchResult = Bookmark & {
  search_score: number;
  search_mode: BookmarkSearchMode;
  search_match_reasons: string[];
  lexical_score?: number;
  exact_match_score?: number;
};

export type BookmarkSearchPayload = {
  bookmarks: BookmarkSearchResult[];
  query: string;
  mode: BookmarkSearchMode;
  result_count: number;
  semantic_available: boolean;
  lexical_available: boolean;
  message?: string;
  debug?: {
    lexical_candidates: number;
    semantic_candidates: number;
    visual_candidates: number;
    fused_candidates: number;
  };
};

export type SearchState =
  | { status: "idle"; query: "" }
  | { status: "loading"; query: string; previousResults: BookmarkSearchResult[] }
  | { status: "success"; query: string; payload: BookmarkSearchPayload }
  | { status: "error"; query: string; message: string; previousResults: BookmarkSearchResult[] };
