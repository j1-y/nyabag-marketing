import crypto from "node:crypto";
import type { Bookmark, BookmarkAiMetadata } from "@/lib/types";
import type { SectionFacts, VisualFactsRow } from "./types";
import { uniqueStrings } from "./taxonomy";

export type MemoryChunkInput = {
  bookmark: Partial<Bookmark>;
  aiMetadata?: Partial<BookmarkAiMetadata> | null;
  visualFacts?: Partial<VisualFactsRow> | null;
};

export type MemoryChunk = {
  chunk_type:
    | "full_page"
    | "hero"
    | "navbar"
    | "footer"
    | "pricing"
    | "features"
    | "testimonials"
    | "dashboard"
    | "form"
    | "table"
    | "cards"
    | "media"
    | "style"
    | "component"
    | "text"
    | "visual_facts";
  chunk_label: string;
  chunk_text: string;
  evidence: Record<string, unknown>;
  confidence: number;
};

function clean(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function line(label: string, value: unknown) {
  const text = Array.isArray(value) ? uniqueStrings(value).join(", ") : clean(value);
  return text ? `${label}: ${text}` : "";
}

function sectionToChunkType(type: string): MemoryChunk["chunk_type"] {
  if (["hero", "navbar", "footer", "pricing", "features", "testimonials", "dashboard", "form", "table"].includes(type)) {
    return type as MemoryChunk["chunk_type"];
  }
  if (type === "bento") return "cards";
  if (type === "gallery" || type === "product_demo") return "media";
  return "visual_facts";
}

function contentHash(text: string) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

export function buildMemoryChunks({
  bookmark,
  aiMetadata,
  visualFacts,
}: MemoryChunkInput): MemoryChunk[] {
  const chunks: MemoryChunk[] = [];
  const vf = visualFacts;
  const facts = vf?.facts as Record<string, unknown> | undefined;
  const sections = Array.isArray(vf?.section_facts) ? (vf.section_facts as SectionFacts[]) : [];
  const components = uniqueStrings([
    ...(vf?.detected_components ?? []),
    ...(aiMetadata?.components ?? []),
  ], 40);
  const patterns = uniqueStrings([
    ...(vf?.detected_patterns ?? []),
    ...(aiMetadata?.ui_patterns ?? []),
  ], 40);
  const styles = uniqueStrings([
    ...(vf?.detected_styles ?? []),
    ...(aiMetadata?.visual_style ?? []),
    ...((facts?.patterns as string[] | undefined) ?? []),
  ], 30);
  const visibleText = uniqueStrings(vf?.visible_text ?? [], 40);
  const visibleBrands = uniqueStrings(vf?.visible_brands ?? [], 30);

  const fullPageLines = [
    line("Title", bookmark.title),
    line("URL", bookmark.url),
    line("Summary", bookmark.summary),
    line("User note", bookmark.note),
    line("Page type", aiMetadata?.page_type),
    line("Industry", aiMetadata?.industry),
    line("Visual components", components),
    line("Visual patterns", patterns),
    line("Visual styles", styles),
    line("Detected colors", vf?.detected_colors),
    line("Visible brands", visibleBrands),
    line("Visible text", visibleText.slice(0, 16)),
    line("AI design context", aiMetadata?.design_context),
    line("Tags", bookmark.tags),
  ].filter(Boolean);

  chunks.push({
    chunk_type: "full_page",
    chunk_label: "Full page visual memory",
    chunk_text: fullPageLines.join("\n").slice(0, 16_000),
    evidence: {
      source: "visual_memory",
      components,
      patterns,
      styles,
      visible_brands: visibleBrands,
      content_hash: contentHash(fullPageLines.join("\n")),
    },
    confidence: Number(vf?.confidence ?? aiMetadata?.confidence ?? 0.55) || 0.55,
  });

  if (components.length || patterns.length || styles.length) {
    chunks.push({
      chunk_type: "visual_facts",
      chunk_label: "Structured visual facts",
      chunk_text: [
        line("Components", components),
        line("Patterns", patterns),
        line("Styles", styles),
        line("Colors", vf?.detected_colors),
        line("Brands", visibleBrands),
      ].filter(Boolean).join("\n").slice(0, 16_000),
      evidence: { source: "visual_facts", components, patterns, styles },
      confidence: Number(vf?.confidence ?? 0.65) || 0.65,
    });
  }

  for (const section of sections.slice(0, 18)) {
    const text = [
      line("Section", `${section.type} ${section.label}`),
      line("Visible text", section.visible_text),
      line("Visible brands", section.visible_brands),
      line("Components", section.components),
      line("Patterns", section.patterns),
      line("Colors", section.colors),
      line("Typography", section.typography),
      line("Evidence", section.evidence_phrases),
    ].filter(Boolean).join("\n");

    if (!text) continue;

    chunks.push({
      chunk_type: sectionToChunkType(section.type),
      chunk_label: section.label || section.type,
      chunk_text: text.slice(0, 16_000),
      evidence: {
        source: "section_facts",
        section_type: section.type,
        bbox: section.bbox,
        components: section.components,
        patterns: section.patterns,
      },
      confidence: section.confidence,
    });
  }

  return chunks.filter((chunk) => clean(chunk.chunk_text).length > 0).slice(0, 28);
}

export function getMemoryChunkContentHash(chunk: MemoryChunk) {
  return contentHash(`${chunk.chunk_type}\n${chunk.chunk_label}\n${chunk.chunk_text}`);
}
