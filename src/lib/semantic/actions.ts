"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { attachAiMetadataToBookmarks, getBookmarkAiMetadata } from "@/lib/bookmarks/ai-metadata";
import { getDesignDnaForBookmark } from "@/lib/design-dna/data";
import { createTextEmbedding, EMBEDDING_MODEL, toPgVectorLiteral } from "@/lib/semantic/embeddings";
import {
  buildBookmarkMemoryText,
  deriveMatchReasons,
  getBookmarkMemoryContentHash,
} from "@/lib/semantic/memory-text";
import type { ActionResult, Bookmark, BookmarkAiMetadata, DesignDna } from "@/lib/types";

type SearchByMemoryPayload = {
  bookmarks: Bookmark[];
  configured: boolean;
  usedFallback: boolean;
  message?: string;
};

type BackfillPayload = {
  processed: number;
  skipped: number;
  failed: number;
};

type SemanticBookmark = Bookmark & {
  ai_metadata?: BookmarkAiMetadata | null;
  design_dna?: DesignDna | null;
};

const MAX_SEARCH_QUERY_LENGTH = 500;
const DEFAULT_MATCH_COUNT = 24;
const SEMANTIC_SIMILARITY_THRESHOLD = 0.35;

type QueryVisualSignals = {
  dark: boolean;
  light: boolean;
  bento: boolean;
  glass: boolean;
  gradient: boolean;
  dashboard: boolean;
  editorial: boolean;
  minimal: boolean;
  monochrome: boolean;
};

function shortError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error || "Memory processing failed");
  return message.replace(/AIza[0-9A-Za-z\-_]+/g, "[redacted]").slice(0, 500);
}

function unique(values: Array<string | null | undefined>, limit = 20) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const next = String(value ?? "").trim();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    result.push(next);
    if (result.length >= limit) break;
  }

  return result;
}

function keywordMatches(bookmark: Bookmark, query: string) {
  const q = query.toLowerCase().trim();
  if (!q) return false;

  return (
    bookmark.title.toLowerCase().includes(q) ||
    bookmark.url.toLowerCase().includes(q) ||
    bookmark.summary.toLowerCase().includes(q) ||
    bookmark.note.toLowerCase().includes(q) ||
    bookmark.tags.some((tag) => tag.toLowerCase().includes(q)) ||
    bookmark.ai_tags?.some((tag) => tag.toLowerCase().includes(q)) ||
    bookmark.ai_patterns?.some((pattern) => pattern.toLowerCase().includes(q))
  );
}

function normalizeForEvidence(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function luminanceFromHex(hex: string) {
  const match = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function inferPaletteMode(bookmark: Bookmark) {
  const luminances = (bookmark.palette ?? [])
    .map(luminanceFromHex)
    .filter((value): value is number => typeof value === "number");

  if (!luminances.length) return "";
  const average = luminances.reduce((sum, value) => sum + value, 0) / luminances.length;
  if (average < 95) return "dark";
  if (average > 175) return "light";
  return "mixed";
}

function getEvidenceText(bookmark: Bookmark) {
  return normalizeForEvidence([
    bookmark.title,
    bookmark.summary,
    bookmark.note,
    ...(bookmark.tags ?? []),
    ...(bookmark.ai_tags ?? []),
    ...(bookmark.ai_patterns ?? []),
    bookmark.ai_description,
    bookmark.ai_metadata?.page_type,
    bookmark.ai_metadata?.industry,
    bookmark.ai_metadata?.design_context,
    ...(bookmark.ai_metadata?.visual_style ?? []),
    ...(bookmark.ai_metadata?.ui_patterns ?? []),
    ...(bookmark.ai_metadata?.components ?? []),
    ...(bookmark.ai_metadata?.suggested_tags ?? []),
  ].filter(Boolean).join(" "));
}

function parseVisualSignals(query: string): QueryVisualSignals {
  const q = normalizeForEvidence(query);
  const negatedDark = /\b(no|not|without)\s+(a\s+)?(dark|black|charcoal)\b/.test(q);

  return {
    dark: !negatedDark && /\b(dark|dark theme|black|black theme|charcoal|midnight|noir)\b/.test(q),
    light: /\b(light|light theme|white|bright|airy|off white|cream|neutral)\b/.test(q),
    bento: /\b(bento|bento grid)\b/.test(q),
    glass: /\b(glassmorphism|glass morphism|frosted glass|translucent|blurred glass)\b/.test(q),
    gradient: /\b(gradient|mesh gradient|color gradient)\b/.test(q),
    dashboard: /\b(dashboard|analytics|chart|charts|graph|data visualization|data viz|metrics)\b/.test(q),
    editorial: /\b(editorial|serif|magazine|publication|type led|type driven)\b/.test(q),
    minimal: /\b(minimal|minimalist|clean|simple|sparse)\b/.test(q),
    monochrome: /\b(monochrome|black and white|grayscale|greyscale)\b/.test(q),
  };
}

function hasAnySignal(signals: QueryVisualSignals) {
  return Object.values(signals).some(Boolean);
}

function evidenceIncludes(evidence: string, terms: string[]) {
  return terms.some((term) => evidence.includes(term));
}

function getVisualEvidenceScore(bookmark: Bookmark, signals: QueryVisualSignals) {
  const evidence = getEvidenceText(bookmark);
  const paletteMode = inferPaletteMode(bookmark);
  let score = 0;

  if (signals.dark && (paletteMode === "dark" || evidenceIncludes(evidence, ["dark ui", "dark theme", "black interface", "charcoal"]))) score += 3;
  if (signals.light && (paletteMode === "light" || evidenceIncludes(evidence, ["light neutral", "light interface", "white space", "airy", "off white"]))) score += 3;
  if (signals.bento && evidenceIncludes(evidence, ["bento grid", "bento layout"])) score += 4;
  if (signals.glass && evidenceIncludes(evidence, ["glassmorphism", "glass morphism", "frosted glass", "translucent"])) score += 3;
  if (signals.gradient && evidenceIncludes(evidence, ["gradient", "mesh gradient"])) score += 2;
  if (signals.dashboard && evidenceIncludes(evidence, ["dashboard", "analytics", "chart", "graph", "data visualization", "data viz", "metrics"])) score += 2;
  if (signals.editorial && evidenceIncludes(evidence, ["editorial", "serif", "magazine", "publication", "type led", "type driven"])) score += 2;
  if (signals.minimal && evidenceIncludes(evidence, ["minimal", "minimalist", "clean", "sparse", "restrained"])) score += 1;
  if (signals.monochrome && evidenceIncludes(evidence, ["monochrome", "black and white", "grayscale", "greyscale"])) score += 2;

  return score;
}

function passesVisualSignals(bookmark: Bookmark, signals: QueryVisualSignals) {
  const evidence = getEvidenceText(bookmark);
  const paletteMode = inferPaletteMode(bookmark);

  if (signals.dark) {
    const hasDarkEvidence = paletteMode === "dark" || evidenceIncludes(evidence, ["dark ui", "dark theme", "black interface", "charcoal", "midnight"]);
    const hasLightVeto = paletteMode === "light" || evidenceIncludes(evidence, ["light neutral", "light interface", "white background", "airy"]);
    if (!hasDarkEvidence || hasLightVeto) return false;
  }

  if (signals.light) {
    const hasLightEvidence = paletteMode === "light" || evidenceIncludes(evidence, ["light neutral", "light interface", "white background", "airy", "off white"]);
    const hasDarkVeto = paletteMode === "dark" || evidenceIncludes(evidence, ["dark ui", "dark theme", "black interface"]);
    if (!hasLightEvidence || hasDarkVeto) return false;
  }

  if (signals.bento && !evidenceIncludes(evidence, ["bento grid", "bento layout"])) return false;
  if (signals.glass && !evidenceIncludes(evidence, ["glassmorphism", "glass morphism", "frosted glass", "translucent"])) return false;
  if (signals.gradient && !evidenceIncludes(evidence, ["gradient", "mesh gradient"])) return false;
  if (signals.dashboard && !evidenceIncludes(evidence, ["dashboard", "analytics", "chart", "graph", "data visualization", "data viz", "metrics"])) return false;
  if (signals.editorial && !evidenceIncludes(evidence, ["editorial", "serif", "magazine", "publication", "type led", "type driven"])) return false;
  if (signals.minimal && !evidenceIncludes(evidence, ["minimal", "minimalist", "clean", "sparse", "restrained"])) return false;
  if (signals.monochrome && !evidenceIncludes(evidence, ["monochrome", "black and white", "grayscale", "greyscale"])) return false;

  return true;
}

function buildSemanticFields(bookmark: SemanticBookmark) {
  const ai = bookmark.ai_metadata;
  const designDna = bookmark.design_dna;

  const aiDescription =
    bookmark.ai_description ||
    ai?.design_context ||
    bookmark.summary ||
    null;

  const aiTags = unique([
    ...(bookmark.ai_tags ?? []),
    ...(ai?.suggested_tags ?? []),
    ...(ai?.visual_style ?? []),
    ...(ai?.components ?? []),
    ai?.page_type,
    ai?.industry,
  ]);

  const aiPatterns = unique([
    ...(bookmark.ai_patterns ?? []),
    ...(ai?.ui_patterns ?? []),
    ...(designDna?.layout_patterns ?? []),
    ...(designDna?.components ?? []),
  ]);

  const aiDesignDna =
    bookmark.ai_design_dna && Object.keys(bookmark.ai_design_dna).length > 0
      ? bookmark.ai_design_dna
      : {
          page_type: ai?.page_type ?? null,
          industry: ai?.industry ?? null,
          visual_style: ai?.visual_style ?? [],
          components: ai?.components ?? [],
          layout_patterns: designDna?.layout_patterns ?? [],
          colors: designDna?.colors?.slice(0, 10) ?? bookmark.palette,
          typography: designDna?.typography?.slice(0, 10) ?? bookmark.fonts,
        };

  return {
    ai_description: aiDescription,
    ai_tags: aiTags,
    ai_patterns: aiPatterns,
    ai_design_dna: aiDesignDna,
  };
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

async function getSemanticBookmark(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookmarkId: string,
  userId: string
): Promise<SemanticBookmark | null> {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("id", bookmarkId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const [aiMetadata, designDna] = await Promise.all([
    getBookmarkAiMetadata(supabase, bookmarkId, userId),
    getDesignDnaForBookmark(supabase, bookmarkId, userId),
  ]);

  return {
    ...(data as Bookmark),
    ai_metadata: aiMetadata,
    design_dna: designDna,
  };
}

async function getKeywordMatches(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  query: string,
  limit = DEFAULT_MATCH_COUNT
) {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return [];

  const bookmarks = await attachAiMetadataToBookmarks(supabase, (data ?? []) as Bookmark[], userId);
  return bookmarks.filter((bookmark) => keywordMatches(bookmark, query)).slice(0, limit);
}

export async function processBookmarkSemanticData(bookmarkId: string): Promise<ActionResult<Bookmark>> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const bookmark = await getSemanticBookmark(supabase, bookmarkId, user.id);
  if (!bookmark) return { success: false, error: "Bookmark not found" };

  await supabase
    .from("bookmarks")
    .update({ semantic_status: "processing", semantic_error: null })
    .eq("id", bookmarkId)
    .eq("user_id", user.id);

  try {
    const semanticFields = buildSemanticFields(bookmark);
    const semanticBookmark = { ...bookmark, ...semanticFields };
    const memoryText = buildBookmarkMemoryText(semanticBookmark);
    const contentHash = getBookmarkMemoryContentHash(memoryText);

    const { data: existing } = await supabase
      .from("bookmark_embeddings")
      .select("content_hash")
      .eq("bookmark_id", bookmarkId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.content_hash === contentHash && bookmark.semantic_status === "ready") {
      const { data: skipped } = await supabase
        .from("bookmarks")
        .update({
          ...semanticFields,
          semantic_status: "ready",
          semantic_error: null,
          semantic_processed_at: new Date().toISOString(),
        })
        .eq("id", bookmarkId)
        .eq("user_id", user.id)
        .select()
        .single();

      return { success: true, data: skipped as Bookmark };
    }

    const embedding = await createTextEmbedding(memoryText);

    const { error: embeddingError } = await supabase.from("bookmark_embeddings").upsert(
      {
        user_id: user.id,
        bookmark_id: bookmarkId,
        embedding: toPgVectorLiteral(embedding),
        embedding_text: memoryText,
        model: EMBEDDING_MODEL,
        content_hash: contentHash,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "bookmark_id" }
    );

    if (embeddingError) throw new Error(embeddingError.message);

    const { data: updated, error: updateError } = await supabase
      .from("bookmarks")
      .update({
        ...semanticFields,
        semantic_status: "ready",
        semantic_error: null,
        semantic_processed_at: new Date().toISOString(),
      })
      .eq("id", bookmarkId)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/app");
    revalidatePath(`/app/bookmarks/${bookmarkId}`);

    return { success: true, data: updated as Bookmark };
  } catch (error) {
    const message = shortError(error);
    const status = message.includes("GEMINI_API_KEY") ? "skipped" : "failed";

    await supabase
      .from("bookmarks")
      .update({
        semantic_status: status,
        semantic_error: message,
        semantic_processed_at: new Date().toISOString(),
      })
      .eq("id", bookmarkId)
      .eq("user_id", user.id);

    revalidatePath("/app");
    revalidatePath(`/app/bookmarks/${bookmarkId}`);

    return { success: false, error: message };
  }
}

export async function processAllBookmarksSemanticData(): Promise<ActionResult<BackfillPayload>> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return { success: false, error: error.message };

  const bookmarks = (data ?? []) as Bookmark[];
  const targets = bookmarks
    .filter((bookmark) => bookmark.semantic_status !== "processing")
    .slice(0, 20);

  const counts: BackfillPayload = { processed: 0, skipped: 0, failed: 0 };

  for (const bookmark of targets) {
    const result = await processBookmarkSemanticData(bookmark.id);
    if (result.success) counts.processed += 1;
    else if (result.error.includes("GEMINI_API_KEY")) counts.skipped += 1;
    else counts.failed += 1;
  }

  revalidatePath("/app");
  revalidatePath("/app/profile");

  return { success: true, data: counts };
}

export async function searchBookmarksByMemory(query: string): Promise<ActionResult<SearchByMemoryPayload>> {
  const { supabase, user } = await getAuthenticatedUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const trimmed = query.replace(/\s+/g, " ").trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
  if (trimmed.length < 2) {
    return { success: true, data: { bookmarks: [], configured: true, usedFallback: false } };
  }

  let semanticBookmarks: Bookmark[] = [];
  const visualSignals = parseVisualSignals(trimmed);
  const hasVisualSignals = hasAnySignal(visualSignals);

  try {
    const embedding = await createTextEmbedding(trimmed);
    const { data: matches, error: rpcError } = await supabase.rpc("match_bookmarks_by_embedding", {
      query_embedding: toPgVectorLiteral(embedding),
      match_user_id: user.id,
      match_count: DEFAULT_MATCH_COUNT,
      similarity_threshold: SEMANTIC_SIMILARITY_THRESHOLD,
    });

    if (rpcError) throw new Error(rpcError.message);

    const rows = (matches ?? []) as Array<{ bookmark_id: string; similarity: number }>;
    const ids = rows.map((row) => row.bookmark_id);

    if (ids.length) {
      const { data: bookmarks, error: bookmarkError } = await supabase
        .from("bookmarks")
        .select("*")
        .eq("user_id", user.id)
        .in("id", ids);

      if (bookmarkError) throw new Error(bookmarkError.message);

      const withAi = await attachAiMetadataToBookmarks(supabase, (bookmarks ?? []) as Bookmark[], user.id);
      const byId = new Map(withAi.map((bookmark) => [bookmark.id, bookmark]));
      semanticBookmarks = rows
        .map((row) => {
          const bookmark = byId.get(row.bookmark_id);
          if (!bookmark) return null;
          return {
            ...bookmark,
            semantic_similarity: row.similarity,
            semantic_match_reasons: deriveMatchReasons(bookmark, trimmed),
          };
        })
        .filter(Boolean) as Bookmark[];

      semanticBookmarks = semanticBookmarks
        .filter((bookmark) => !hasVisualSignals || passesVisualSignals(bookmark, visualSignals))
        .sort((a, b) => {
          const visualDelta = getVisualEvidenceScore(b, visualSignals) - getVisualEvidenceScore(a, visualSignals);
          if (visualDelta !== 0) return visualDelta;
          return (b.semantic_similarity ?? 0) - (a.semantic_similarity ?? 0);
        });
    }
  } catch (error) {
    const message = shortError(error);
    const keywordFallback = (await getKeywordMatches(supabase, user.id, trimmed))
      .filter((bookmark) => !hasVisualSignals || passesVisualSignals(bookmark, visualSignals));

    return {
      success: true,
      data: {
        bookmarks: keywordFallback,
        configured: !message.includes("GEMINI_API_KEY"),
        usedFallback: true,
        message: message.includes("GEMINI_API_KEY")
          ? "Memory search is not configured yet. Add GEMINI_API_KEY and process your bookmarks."
          : "Memory search is having trouble, so Nyabag used keyword matches.",
      },
    };
  }

  const keywordFallback = !hasVisualSignals && semanticBookmarks.length < DEFAULT_MATCH_COUNT
    ? await getKeywordMatches(supabase, user.id, trimmed, DEFAULT_MATCH_COUNT)
    : [];

  const merged = new Map<string, Bookmark>();
  for (const bookmark of semanticBookmarks) merged.set(bookmark.id, bookmark);
  for (const bookmark of keywordFallback) {
    if (!merged.has(bookmark.id)) merged.set(bookmark.id, bookmark);
  }

  const results = Array.from(merged.values()).slice(0, DEFAULT_MATCH_COUNT);

  return {
    success: true,
    data: {
      bookmarks: results,
      configured: true,
      usedFallback: semanticBookmarks.length === 0 && keywordFallback.length > 0,
      message: results.length === 0
        ? hasVisualSignals
          ? "No memory matches with that visual evidence yet. Reprocess older saves if their design read is stale."
          : "No memory matches yet. New saves may still be processing."
        : undefined,
    },
  };
}
