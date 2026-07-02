import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_DIMENSION = 768;
export const EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";

let geminiClient = null;

const GENERIC_RETRIEVAL_TERMS = new Set([
  "ai",
  "app",
  "b2b",
  "business",
  "company",
  "homepage",
  "landing-page",
  "marketing",
  "product",
  "saas",
  "software",
  "startup",
  "tool",
  "tools",
  "website",
]);

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function cleanArray(value, limit = 16) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];

  for (const item of value) {
    const next = clean(item);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    result.push(next);
    if (result.length >= limit) break;
  }

  return result;
}

function addLine(lines, label, value) {
  const text = clean(value);
  if (text) lines.push(`${label}: ${text}`);
}

function addArrayLine(lines, label, value, limit = 16) {
  const values = cleanArray(value, limit);
  if (values.length) lines.push(`${label}: ${values.join(", ")}`);
}

function specificArray(value, limit = 16) {
  return cleanArray(value, limit).filter((item) => !GENERIC_RETRIEVAL_TERMS.has(item.toLowerCase()));
}

function addSpecificArrayLine(lines, label, value, limit = 16) {
  const values = specificArray(value, limit);
  if (values.length) lines.push(`${label}: ${values.join(", ")}`);
}

function luminanceFromHex(hex) {
  const match = String(hex ?? "").match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function unique(values, limit = 20) {
  const seen = new Set();
  const result = [];

  for (const value of values) {
    const next = clean(value);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    result.push(next);
    if (result.length >= limit) break;
  }

  return result;
}

function inferColorMode(bookmark, ai) {
  const visualText = [
    ...(ai?.visual_style ?? []),
    ...(bookmark.ai_tags ?? []),
    ...(bookmark.tags ?? []),
    bookmark.ai_description,
    ai?.design_context,
  ].join(" ").toLowerCase();

  const luminances = cleanArray(bookmark.palette)
    .map(luminanceFromHex)
    .filter((value) => typeof value === "number");
  const average = luminances.length
    ? luminances.reduce((sum, value) => sum + value, 0) / luminances.length
    : null;
  const paletteMode = average === null ? "" : average < 95 ? "dark" : average > 175 ? "light" : "mixed";

  if (paletteMode === "light" && /\b(dark|black|charcoal|midnight|dark-ui|dark-theme)\b/.test(visualText)) {
    return "light interface";
  }

  if (paletteMode === "dark" && /\b(light|white|bright|airy|neutral|off-white|cream|beige)\b/.test(visualText)) {
    return "dark interface";
  }

  if (/\b(dark|black|charcoal|midnight|dark-ui|dark-theme)\b/.test(visualText)) {
    return "dark interface";
  }

  if (/\b(light|white|bright|airy|neutral|off-white|cream|beige)\b/.test(visualText)) {
    return "light interface";
  }

  if (paletteMode === "dark") return "dark interface";
  if (paletteMode === "light") return "light interface";
  if (paletteMode === "mixed") return "mixed contrast interface";
  return "";
}

function toPgVectorLiteral(values) {
  return `[${values.map((value) => Number(value).toPrecision(12)).join(",")}]`;
}

function shortError(error) {
  return (error instanceof Error ? error.message : String(error || "Memory processing failed")).slice(0, 500);
}

function buildSemanticFields(bookmark, ai) {
  return {
    ai_description: bookmark.ai_description || ai?.design_context || bookmark.summary || null,
    ai_tags: unique([
      ...(bookmark.ai_tags ?? []),
      ...(ai?.suggested_tags ?? []),
      ...(ai?.visual_style ?? []),
      ...(ai?.components ?? []),
      ai?.page_type,
      ai?.industry,
    ]),
    ai_patterns: unique([
      ...(bookmark.ai_patterns ?? []),
      ...(ai?.ui_patterns ?? []),
    ]),
  };
}

function buildMemoryText(bookmark, ai) {
  const lines = [];
  const colorMode = inferColorMode(bookmark, ai);

  addLine(lines, "Title", bookmark.title);
  addLine(lines, "Domain", getDomain(bookmark.url));
  addLine(lines, "URL", bookmark.url);
  addLine(lines, "Summary", bookmark.summary);
  addLine(lines, "User note", bookmark.note);
  addLine(lines, "Save reason", bookmark.save_reason);
  addLine(lines, "Color mode", colorMode);
  if (colorMode === "light interface") lines.push("Negative visual evidence: not a dark theme");
  if (colorMode === "dark interface") lines.push("Positive visual evidence: dark theme");
  addLine(lines, "Visual evidence", bookmark.ai_description || ai?.design_context);
  addLine(lines, "Page type", ai?.page_type);
  addLine(lines, "Industry", ai?.industry);
  addArrayLine(lines, "User tags", bookmark.tags);
  addSpecificArrayLine(lines, "Specific AI tags", bookmark.ai_tags?.length ? bookmark.ai_tags : ai?.suggested_tags);
  addSpecificArrayLine(lines, "Layout structure", bookmark.ai_patterns?.length ? bookmark.ai_patterns : ai?.ui_patterns);
  addSpecificArrayLine(lines, "Visual style", ai?.visual_style);
  addSpecificArrayLine(lines, "Notable UI details", ai?.components);
  addArrayLine(lines, "Palette colors", bookmark.palette);
  addArrayLine(lines, "Fonts", bookmark.fonts);

  return lines.join("\n").slice(0, 16_000);
}

async function createEmbedding(text) {
  const normalized = clean(text).slice(0, 12_000);
  if (!normalized) throw new Error("Cannot create an embedding for empty text");

  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: normalized,
    config: { outputDimensionality: EMBEDDING_DIMENSION },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) throw new Error("Gemini returned an empty embedding");
  if (values.length !== EMBEDDING_DIMENSION) {
    throw new Error(`Gemini embedding dimension mismatch: expected ${EMBEDDING_DIMENSION}, received ${values.length}`);
  }

  return values;
}

export async function processBookmarkSemanticMemory({ supabase, bookmarkId, userId }) {
  const { data: bookmark, error: bookmarkError } = await supabase
    .from("bookmarks")
    .select("*")
    .eq("id", bookmarkId)
    .eq("user_id", userId)
    .maybeSingle();

  if (bookmarkError) throw new Error(`Could not read bookmark for memory search: ${bookmarkError.message}`);
  if (!bookmark) throw new Error("Bookmark not found for memory search");

  const { data: ai } = await supabase
    .from("bookmark_ai_metadata")
    .select("*")
    .eq("bookmark_id", bookmarkId)
    .eq("user_id", userId)
    .maybeSingle();

  await supabase
    .from("bookmarks")
    .update({ semantic_status: "processing", semantic_error: null })
    .eq("id", bookmarkId)
    .eq("user_id", userId);

  try {
    const semanticFields = buildSemanticFields(bookmark, ai);
    const semanticBookmark = { ...bookmark, ...semanticFields };
    const memoryText = buildMemoryText(semanticBookmark, ai);
    const contentHash = crypto.createHash("sha256").update(memoryText).digest("hex");

    const { data: existing } = await supabase
      .from("bookmark_embeddings")
      .select("content_hash")
      .eq("bookmark_id", bookmarkId)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.content_hash === contentHash && bookmark.semantic_status === "ready") {
      await supabase
        .from("bookmarks")
        .update({
          ...semanticFields,
          semantic_status: "ready",
          semantic_error: null,
          semantic_processed_at: new Date().toISOString(),
        })
        .eq("id", bookmarkId)
        .eq("user_id", userId);
      return { status: "skipped" };
    }

    const embedding = await createEmbedding(memoryText);
    const { error: embeddingError } = await supabase
      .from("bookmark_embeddings")
      .upsert(
        {
          user_id: userId,
          bookmark_id: bookmarkId,
          embedding: toPgVectorLiteral(embedding),
          embedding_text: memoryText,
          model: EMBEDDING_MODEL,
          content_hash: contentHash,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "bookmark_id" }
      );

    if (embeddingError) throw new Error(`Could not save bookmark embedding: ${embeddingError.message}`);

    await supabase
      .from("bookmarks")
      .update({
        ...semanticFields,
        semantic_status: "ready",
        semantic_error: null,
        semantic_processed_at: new Date().toISOString(),
      })
      .eq("id", bookmarkId)
      .eq("user_id", userId);

    return { status: "ready" };
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
      .eq("user_id", userId);

    return { status, error: message };
  }
}
