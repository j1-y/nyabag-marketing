import crypto from "node:crypto";
import { GoogleGenAI } from "@google/genai";

export const CHUNK_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL?.trim() || "gemini-embedding-2";
const EMBEDDING_DIMENSION = 768;

let geminiClient = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}

function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function unique(values, limit = 30) {
  const seen = new Set();
  const result = [];
  for (const value of values ?? []) {
    const next = clean(value);
    if (!next) continue;
    const key = next.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(next);
    if (result.length >= limit) break;
  }
  return result;
}

function line(label, value) {
  const text = Array.isArray(value) ? unique(value).join(", ") : clean(value);
  return text ? `${label}: ${text}` : "";
}

function hashText(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function toPgVectorLiteral(values) {
  return `[${values.map((value) => Number(value).toPrecision(12)).join(",")}]`;
}

function sectionToChunkType(type) {
  if (["hero", "navbar", "footer", "pricing", "features", "testimonials", "dashboard", "form", "table"].includes(type)) {
    return type;
  }
  if (type === "bento") return "cards";
  if (type === "gallery" || type === "product_demo") return "media";
  return "visual_facts";
}

export function buildVisualMemoryChunks({ bookmark, aiMetadata, visualFacts }) {
  const facts = visualFacts?.facts ?? {};
  const sections = Array.isArray(visualFacts?.section_facts) ? visualFacts.section_facts : [];
  const components = unique([
    ...(visualFacts?.detected_components ?? []),
    ...(aiMetadata?.components ?? []),
  ], 50);
  const patterns = unique([
    ...(visualFacts?.detected_patterns ?? []),
    ...(aiMetadata?.ui_patterns ?? []),
  ], 50);
  const styles = unique([
    ...(visualFacts?.detected_styles ?? []),
    ...(aiMetadata?.visual_style ?? []),
  ], 40);
  const visibleText = unique(visualFacts?.visible_text ?? facts.content?.visible_text ?? [], 50);
  const visibleBrands = unique(visualFacts?.visible_brands ?? facts.content?.brand_names ?? [], 40);
  const colors = unique(visualFacts?.detected_colors ?? facts.colors?.palette ?? [], 30);

  const chunks = [];
  const fullPageText = [
    line("Title", bookmark.title),
    line("URL", bookmark.url),
    line("Summary", bookmark.summary),
    line("User note", bookmark.note),
    line("Page type", aiMetadata?.page_type || facts.page?.page_type),
    line("Industry", aiMetadata?.industry),
    line("Visual components", components),
    line("Visual patterns", patterns),
    line("Visual styles", styles),
    line("Colors", colors),
    line("Visible brands", visibleBrands),
    line("Visible text", visibleText.slice(0, 20)),
    line("AI design context", aiMetadata?.design_context),
    line("Tags", bookmark.tags),
  ].filter(Boolean).join("\n");

  chunks.push({
    chunk_type: "full_page",
    chunk_label: "Full page visual memory",
    chunk_text: fullPageText.slice(0, 16000),
    evidence: { source: "visual_memory", components, patterns, styles, colors, visible_brands: visibleBrands },
    confidence: Number(visualFacts?.confidence ?? aiMetadata?.confidence ?? 0.55) || 0.55,
  });

  const factsText = [
    line("Components", components),
    line("Patterns", patterns),
    line("Styles", styles),
    line("Colors", colors),
    line("Brands", visibleBrands),
  ].filter(Boolean).join("\n");
  if (factsText) {
    chunks.push({
      chunk_type: "visual_facts",
      chunk_label: "Structured visual facts",
      chunk_text: factsText.slice(0, 16000),
      evidence: { source: "visual_facts", components, patterns, styles, colors },
      confidence: Number(visualFacts?.confidence ?? 0.65) || 0.65,
    });
  }

  for (const section of sections.slice(0, 18)) {
    const sectionText = [
      line("Section", `${section.type} ${section.label}`),
      line("Visible text", section.visible_text),
      line("Visible brands", section.visible_brands),
      line("Components", section.components),
      line("Patterns", section.patterns),
      line("Colors", section.colors),
      line("Typography", section.typography),
      line("Evidence", section.evidence_phrases),
    ].filter(Boolean).join("\n");
    if (!sectionText) continue;
    chunks.push({
      chunk_type: sectionToChunkType(section.type),
      chunk_label: section.label || section.type,
      chunk_text: sectionText.slice(0, 16000),
      evidence: {
        source: "section_facts",
        section_type: section.type,
        bbox: section.bbox,
        components: section.components,
        patterns: section.patterns,
      },
      confidence: Number(section.confidence ?? 0.55) || 0.55,
    });
  }

  return chunks.filter((chunk) => clean(chunk.chunk_text)).slice(0, 28);
}

async function createEmbedding(text) {
  const normalized = clean(text).slice(0, 12000);
  if (!normalized) throw new Error("Cannot create an embedding for empty text");

  const ai = getGeminiClient();
  const response = await ai.models.embedContent({
    model: CHUNK_EMBEDDING_MODEL,
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

export async function upsertVisualMemoryChunks({ supabase, bookmark, aiMetadata, visualFacts }) {
  const chunks = buildVisualMemoryChunks({ bookmark, aiMetadata, visualFacts });
  const rows = [];
  let embedded = 0;
  let embeddingError = "";

  for (const chunk of chunks) {
    let embedding = null;
    let model = "";
    if (isGeminiConfigured()) {
      try {
        embedding = toPgVectorLiteral(await createEmbedding(chunk.chunk_text));
        model = CHUNK_EMBEDDING_MODEL;
        embedded += 1;
      } catch (error) {
        embeddingError ||= error instanceof Error ? error.message : String(error);
      }
    }

    rows.push({
      user_id: bookmark.user_id,
      bookmark_id: bookmark.id,
      chunk_type: chunk.chunk_type,
      chunk_label: chunk.chunk_label,
      chunk_text: chunk.chunk_text,
      evidence: chunk.evidence,
      embedding,
      model,
      content_hash: hashText(`${chunk.chunk_type}\n${chunk.chunk_label}\n${chunk.chunk_text}`),
      confidence: Math.min(1, Math.max(0, Number(chunk.confidence ?? 0))),
      updated_at: new Date().toISOString(),
    });
  }

  const { error: deleteError } = await supabase
    .from("bookmark_memory_chunks")
    .delete()
    .eq("bookmark_id", bookmark.id)
    .eq("user_id", bookmark.user_id);

  if (deleteError) throw new Error(`Could not clear old memory chunks: ${deleteError.message}`);

  if (rows.length) {
    const { error } = await supabase
      .from("bookmark_memory_chunks")
      .insert(rows);

    if (error) throw new Error(`Could not save memory chunks: ${error.message}`);
  }

  return {
    chunks: rows.length,
    embedded,
    status: isGeminiConfigured() ? (embeddingError && embedded === 0 ? "failed" : "ready") : "skipped",
    error: embeddingError,
  };
}

