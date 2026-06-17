import type { Bookmark } from "@/lib/types";
import type { TemporalFilter } from "./temporal-query";

export type BookmarkSearchMode = "exact" | "hybrid" | "keyword" | "semantic" | "temporal";

export type BookmarkSearchRequest = {
  query: string;
  timeZone: string;
  locale?: string;
};

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
  effectiveQuery: string;
  mode: BookmarkSearchMode;
  result_count: number;
  semantic_available: boolean;
  lexical_available: boolean;
  configured: boolean;
  usedSemantic: boolean;
  totalCandidates: number;
  temporalFilter?: Omit<TemporalFilter, "sourceText">;
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
