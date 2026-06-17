import "server-only";

import type { Bookmark } from "@/lib/types";
import type { QueryUnderstanding } from "./types";

export function isVisualRerankEnabled() {
  return process.env.VISUAL_SEARCH_RERANK_ENABLED?.trim().toLowerCase() === "true";
}

export function getVisualRerankMaxCandidates() {
  const value = Number.parseInt(process.env.VISUAL_SEARCH_RERANK_MAX_CANDIDATES ?? "6", 10);
  return Number.isFinite(value) ? Math.min(Math.max(value, 1), 8) : 6;
}

export async function rerankVisualSearchResults<T extends Bookmark>({
  queryUnderstanding,
  results,
}: {
  query: string;
  userId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  queryUnderstanding: QueryUnderstanding;
  results: T[];
}): Promise<T[]> {
  if (!isVisualRerankEnabled()) return results;
  if (!queryUnderstanding.hasVisualConstraints) return results;

  // TODO: Wire Gemini screenshot verification here once cost/latency behavior is validated
  // against production screenshots. The hybrid facts path already returns evidence-backed
  // labels, and this no-op keeps the feature flag harmless until vision reranking is tested.
  return results;
}

