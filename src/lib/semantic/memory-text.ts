import "server-only";

import crypto from "node:crypto";
import { getDomain } from "@/lib/data";
import type { Bookmark, BookmarkAiMetadata, DesignDna } from "@/lib/types";

type BookmarkLike = Partial<Bookmark> & {
  ai_metadata?: BookmarkAiMetadata | null;
  design_dna?: DesignDna | null;
};

function clean(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).replace(/\s+/g, " ").trim();
}

function cleanArray(value: unknown, limit = 16) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  const values: string[] = [];

  for (const item of value) {
    const next = clean(item);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    values.push(next);
    if (values.length >= limit) break;
  }

  return values;
}

function compactJsonRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];

  return Object.entries(value as Record<string, unknown>)
    .map(([key, entry]) => {
      if (Array.isArray(entry)) {
        const items = cleanArray(entry, 8);
        return items.length ? `${key}: ${items.join(", ")}` : "";
      }

      if (entry && typeof entry === "object") return "";
      const text = clean(entry);
      return text ? `${key}: ${text}` : "";
    })
    .filter(Boolean)
    .slice(0, 12);
}

function addLine(lines: string[], label: string, value: unknown) {
  const text = clean(value);
  if (text) lines.push(`${label}: ${text}`);
}

function addArrayLine(lines: string[], label: string, value: unknown, limit = 16) {
  const values = cleanArray(value, limit);
  if (values.length) lines.push(`${label}: ${values.join(", ")}`);
}

function readableLabel(value: string) {
  return value
    .replace(/[-_]+/g, " ")
    .replace(/\bui\b/gi, "UI")
    .replace(/\bux\b/gi, "UX")
    .replace(/\bsaas\b/gi, "SaaS")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildBookmarkMemoryText(bookmark: BookmarkLike): string {
  const lines: string[] = [];
  const domain = bookmark.url ? getDomain(bookmark.url) : "";
  const aiMetadata = bookmark.ai_metadata;
  const designDna = bookmark.design_dna;

  addLine(lines, "Title", bookmark.title);
  addLine(lines, "Domain", domain);
  addLine(lines, "URL", bookmark.url);
  addLine(lines, "Summary", bookmark.summary);
  addLine(lines, "User note", bookmark.note);
  addLine(lines, "Save reason", bookmark.save_reason);
  addLine(lines, "AI visual description", bookmark.ai_description || aiMetadata?.design_context);
  addLine(lines, "Page type", aiMetadata?.page_type);
  addLine(lines, "Industry", aiMetadata?.industry);
  addArrayLine(lines, "User tags", bookmark.tags);
  addArrayLine(lines, "AI tags", bookmark.ai_tags?.length ? bookmark.ai_tags : aiMetadata?.suggested_tags);
  addArrayLine(lines, "UI patterns", bookmark.ai_patterns?.length ? bookmark.ai_patterns : aiMetadata?.ui_patterns);
  addArrayLine(lines, "Visual style", aiMetadata?.visual_style);
  addArrayLine(lines, "Components", aiMetadata?.components);
  addArrayLine(lines, "Palette colors", bookmark.palette);
  addArrayLine(lines, "Fonts", bookmark.fonts);
  addArrayLine(lines, "Design DNA colors", designDna?.colors?.map((color) => `${color.name} ${color.hex} ${color.usage}`));
  addArrayLine(lines, "Design DNA typography", designDna?.typography?.map((font) => `${font.role} ${font.fontFamily} ${font.fontWeight}`));
  addArrayLine(lines, "Design DNA components", designDna?.components);
  addArrayLine(lines, "Design DNA layout patterns", designDna?.layout_patterns);

  const compactDna = compactJsonRecord(bookmark.ai_design_dna);
  if (compactDna.length) lines.push(`AI design DNA: ${compactDna.join("; ")}`);

  return lines.join("\n").slice(0, 16_000);
}

export function getBookmarkMemoryContentHash(memoryText: string): string {
  return crypto.createHash("sha256").update(memoryText).digest("hex");
}

export function deriveMatchReasons(bookmark: BookmarkLike, query = ""): string[] {
  const q = query.toLowerCase();
  const candidates = [
    ...(bookmark.ai_patterns ?? []),
    ...(bookmark.ai_tags ?? []),
    ...(bookmark.ai_metadata?.ui_patterns ?? []),
    ...(bookmark.ai_metadata?.visual_style ?? []),
    ...(bookmark.ai_metadata?.components ?? []),
    bookmark.ai_metadata?.page_type,
    ...(bookmark.tags ?? []),
  ]
    .filter(Boolean)
    .map((value) => String(value));

  const scored = candidates
    .map((value) => ({
      value,
      score: q && q.includes(value.toLowerCase().replace(/[-_]+/g, " ")) ? 2 : 1,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ value }) => readableLabel(value));

  return Array.from(new Set(scored)).slice(0, 4);
}
