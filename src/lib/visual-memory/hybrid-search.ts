import "server-only";

import type { Bookmark } from "@/lib/types";
import type { createClient } from "@/lib/supabase/server";
import { attachAiMetadataToBookmarks } from "@/lib/bookmarks/ai-metadata";
import { createTextEmbedding, toPgVectorLiteral } from "@/lib/semantic/embeddings";
import { deriveMatchReasons } from "@/lib/semantic/memory-text";
import { understandVisualQuery } from "./query";
import { rerankVisualSearchResults } from "./rerank";
import {
  buildScoreBreakdown,
  classifyVisualMatch,
  fallbackEvidenceFromConcepts,
  scoreVisualFacts,
} from "./scoring";
import type { QueryUnderstanding, VisualFactsRow, VisualSearchResultFields } from "./types";
import { normalizeConcept, uniqueStrings } from "./taxonomy";

const DEFAULT_MATCH_COUNT = 24;
const VECTOR_THRESHOLD = 0.2;
const LEGACY_VECTOR_THRESHOLD = 0.32;

type SupabaseClientLike = Awaited<ReturnType<typeof createClient>>;

type Candidate = {
  bookmarkId: string;
  vector: number;
  lexical: number;
  legacyVector: number;
  keyword: number;
  chunkTypes: string[];
  concepts: string[];
};

export type HybridSearchPayload = {
  bookmarks: Array<Bookmark & VisualSearchResultFields>;
  configured: boolean;
  usedFallback: boolean;
  message?: string;
  queryUnderstanding: QueryUnderstanding;
};

function visualSearchEnabled() {
  return process.env.VISUAL_MEMORY_SEARCH_ENABLED?.trim().toLowerCase() !== "false";
}

function shortError(error: unknown) {
  return (error instanceof Error ? error.message : String(error || "Visual memory search failed"))
    .replace(/AIza[0-9A-Za-z\-_]+/g, "[redacted]")
    .slice(0, 500);
}

function keywordMatches(bookmark: Bookmark, normalizedQuery: string) {
  if (!normalizedQuery) return false;
  const haystack = normalizeConcept([
    bookmark.title,
    bookmark.url,
    bookmark.summary,
    bookmark.note,
    ...(bookmark.tags ?? []),
    ...(bookmark.ai_tags ?? []),
    ...(bookmark.ai_patterns ?? []),
    bookmark.ai_metadata?.design_context,
    bookmark.ai_metadata?.page_type,
    ...(bookmark.ai_metadata?.visual_style ?? []),
    ...(bookmark.ai_metadata?.ui_patterns ?? []),
    ...(bookmark.ai_metadata?.components ?? []),
  ].filter(Boolean).join(" "));

  return normalizedQuery
    .split(" ")
    .filter((term) => term.length > 2)
    .some((term) => haystack.includes(term));
}

function mergeCandidate(candidates: Map<string, Candidate>, bookmarkId: string, patch: Partial<Candidate>) {
  const existing = candidates.get(bookmarkId) ?? {
    bookmarkId,
    vector: 0,
    lexical: 0,
    legacyVector: 0,
    keyword: 0,
    chunkTypes: [],
    concepts: [],
  };

  candidates.set(bookmarkId, {
    ...existing,
    vector: Math.max(existing.vector, patch.vector ?? 0),
    lexical: Math.max(existing.lexical, patch.lexical ?? 0),
    legacyVector: Math.max(existing.legacyVector, patch.legacyVector ?? 0),
    keyword: Math.max(existing.keyword, patch.keyword ?? 0),
    chunkTypes: uniqueStrings([...(existing.chunkTypes ?? []), ...(patch.chunkTypes ?? [])], 10),
    concepts: uniqueStrings([...(existing.concepts ?? []), ...(patch.concepts ?? [])], 12),
  });
}

async function getKeywordCandidates(supabase: SupabaseClientLike, userId: string, query: QueryUnderstanding) {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return [];

  const bookmarks = await attachAiMetadataToBookmarks(supabase, (data ?? []) as Bookmark[], userId);
  return bookmarks.filter((bookmark) => keywordMatches(bookmark, query.normalized)).slice(0, DEFAULT_MATCH_COUNT);
}

async function getRowsByIds(supabase: SupabaseClientLike, userId: string, ids: string[]) {
  if (!ids.length) return [] as Bookmark[];
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .in("id", ids);

  if (error) throw new Error(error.message);
  return attachAiMetadataToBookmarks(supabase, (data ?? []) as Bookmark[], userId);
}

async function getVisualFactsRows(supabase: SupabaseClientLike, userId: string, ids: string[]) {
  if (!ids.length) return new Map<string, VisualFactsRow>();
  const { data, error } = await supabase
    .from("bookmark_visual_facts")
    .select("*")
    .eq("user_id", userId)
    .in("bookmark_id", ids);

  if (error) return new Map<string, VisualFactsRow>();
  return new Map(((data ?? []) as VisualFactsRow[]).map((row) => [row.bookmark_id, row]));
}

export async function searchBookmarksHybridVisual({
  supabase,
  userId,
  query,
  limit = DEFAULT_MATCH_COUNT,
}: {
  supabase: SupabaseClientLike;
  userId: string;
  query: string;
  limit?: number;
}): Promise<HybridSearchPayload> {
  const queryUnderstanding = understandVisualQuery(query);
  if (!visualSearchEnabled()) {
    return {
      bookmarks: [],
      configured: true,
      usedFallback: true,
      queryUnderstanding,
      message: "Visual memory search is disabled.",
    };
  }

  const candidates = new Map<string, Candidate>();
  const keywordCandidates = await getKeywordCandidates(supabase, userId, queryUnderstanding);

  for (const bookmark of keywordCandidates) {
    mergeCandidate(candidates, bookmark.id, {
      keyword: 1,
      concepts: [...queryUnderstanding.requirements, ...queryUnderstanding.optional].map((item) => item.concept),
    });
  }

  let configured = true;
  try {
    const embedding = await createTextEmbedding(queryUnderstanding.original);
    const vectorLiteral = toPgVectorLiteral(embedding);

    const [chunkVector, legacyVector, chunkText] = await Promise.all([
      supabase.rpc("match_bookmark_memory_chunks", {
        query_embedding: vectorLiteral,
        match_user_id: userId,
        match_count: limit * 3,
        similarity_threshold: VECTOR_THRESHOLD,
      }),
      supabase.rpc("match_bookmarks_by_embedding", {
        query_embedding: vectorLiteral,
        match_user_id: userId,
        match_count: limit * 2,
        similarity_threshold: LEGACY_VECTOR_THRESHOLD,
      }),
      supabase.rpc("search_bookmark_memory_chunks_text", {
        query_text: queryUnderstanding.original,
        match_user_id: userId,
        match_count: limit * 3,
      }),
    ]);

    if (!chunkVector.error) {
      for (const row of chunkVector.data ?? []) {
        mergeCandidate(candidates, row.bookmark_id, {
          vector: Number(row.similarity ?? 0),
          chunkTypes: [row.chunk_type].filter(Boolean),
        });
      }
    }

    if (!legacyVector.error) {
      for (const row of legacyVector.data ?? []) {
        mergeCandidate(candidates, row.bookmark_id, {
          legacyVector: Number(row.similarity ?? 0),
        });
      }
    }

    if (!chunkText.error) {
      for (const row of chunkText.data ?? []) {
        mergeCandidate(candidates, row.bookmark_id, {
          lexical: Math.min(1, Number(row.rank ?? 0) * 10),
          chunkTypes: [row.chunk_type].filter(Boolean),
        });
      }
    }
  } catch (error) {
    configured = !shortError(error).includes("GEMINI_API_KEY");
  }

  const ids = Array.from(candidates.keys());
  if (!ids.length) {
    return {
      bookmarks: [],
      configured,
      usedFallback: keywordCandidates.length > 0,
      queryUnderstanding,
      message: queryUnderstanding.hasVisualConstraints
        ? "No visual memory matches with that evidence yet. Reprocess older saves if their visual memory is missing."
        : "No memory matches yet. New saves may still be processing.",
    };
  }

  const [bookmarks, visualFacts] = await Promise.all([
    getRowsByIds(supabase, userId, ids),
    getVisualFactsRows(supabase, userId, ids),
  ]);

  const byId = new Map(bookmarks.map((bookmark) => [bookmark.id, bookmark]));
  const scored = ids
    .map((id) => {
      const bookmark = byId.get(id);
      if (!bookmark) return null;
      const candidate = candidates.get(id)!;
      const facts = visualFacts.get(id);
      const factScore = scoreVisualFacts(queryUnderstanding, facts);
      const vector = candidate.vector;
      const legacyVector = candidate.legacyVector;
      const lexical = candidate.lexical;
      const keyword = candidate.keyword;
      const final = queryUnderstanding.hasVisualConstraints
        ? factScore.fact * 0.55 + vector * 0.18 + lexical * 0.12 + legacyVector * 0.1 + keyword * 0.05
        : vector * 0.35 + legacyVector * 0.3 + lexical * 0.18 + keyword * 0.17 + factScore.fact * 0.1;
      const classified = classifyVisualMatch({
        query: queryUnderstanding,
        factScore: factScore.fact,
        finalScore: final,
        missing: factScore.missing,
        hasFacts: factScore.hasFacts,
      });
      const matchedConcepts = uniqueStrings(factScore.matched.map((item) => item.concept), 8);
      const semanticReasons = deriveMatchReasons(bookmark, queryUnderstanding.original);

      return {
        ...bookmark,
        semantic_similarity: Math.max(vector, legacyVector) || undefined,
        semantic_match_reasons: matchedConcepts.length ? factScore.matched.map((item) => item.label).slice(0, 4) : semanticReasons,
        match_strength: classified.strength,
        match_label: classified.label,
        matched_concepts: matchedConcepts.length ? matchedConcepts : uniqueStrings(candidate.concepts, 6),
        missing_concepts: factScore.missing,
        visual_match_evidence: factScore.matched.length
          ? factScore.matched.slice(0, 6)
          : fallbackEvidenceFromConcepts(candidate.concepts).slice(0, 3),
        visual_score_breakdown: buildScoreBreakdown({
          final,
          fact: factScore.fact,
          lexical,
          vector,
          legacyVector,
          keyword,
        }),
      } satisfies Bookmark & VisualSearchResultFields;
    })
    .filter(Boolean) as Array<Bookmark & VisualSearchResultFields>;

  const ordered = scored.sort((a, b) => {
    const aScore = a.visual_score_breakdown?.final ?? 0;
    const bScore = b.visual_score_breakdown?.final ?? 0;
    if (bScore !== aScore) return bScore - aScore;
    return (b.semantic_similarity ?? 0) - (a.semantic_similarity ?? 0);
  });

  const reranked = await rerankVisualSearchResults({
    query,
    userId,
    supabase,
    queryUnderstanding,
    results: ordered.slice(0, limit),
  });

  return {
    bookmarks: reranked,
    configured,
    usedFallback: false,
    queryUnderstanding,
    message: reranked.length
      ? undefined
      : queryUnderstanding.hasVisualConstraints
        ? "No visual memory matches with that evidence yet. Reprocess older saves if their visual memory is missing."
        : "No memory matches yet. New saves may still be processing.",
  };
}
