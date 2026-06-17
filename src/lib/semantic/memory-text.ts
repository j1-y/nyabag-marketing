import "server-only";

import crypto from "node:crypto";
import { getDomain } from "@/lib/data";
import type { Bookmark, BookmarkAiMetadata, DesignDna } from "@/lib/types";

type BookmarkLike = Partial<Bookmark> & {
  ai_metadata?: BookmarkAiMetadata | null;
  design_dna?: DesignDna | null;
};

export const BOOKMARK_RETRIEVAL_SCHEMA_VERSION = 2;

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

function specificArray(value: unknown, limit = 16) {
  return cleanArray(value, limit).filter((item) => !GENERIC_RETRIEVAL_TERMS.has(item.toLowerCase()));
}

function addSpecificArrayLine(lines: string[], label: string, value: unknown, limit = 16) {
  const values = specificArray(value, limit);
  if (values.length) lines.push(`${label}: ${values.join(", ")}`);
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

function inferColorMode(bookmark: BookmarkLike) {
  const visualText = [
    ...(bookmark.ai_metadata?.visual_style ?? []),
    ...(bookmark.ai_tags ?? []),
    ...(bookmark.tags ?? []),
    bookmark.ai_description,
    bookmark.ai_metadata?.design_context,
  ].join(" ").toLowerCase();

  const luminances = cleanArray(bookmark.palette)
    .map(luminanceFromHex)
    .filter((value): value is number => typeof value === "number");
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

  lines.push(`Retrieval schema: bookmark-v${BOOKMARK_RETRIEVAL_SCHEMA_VERSION}`);
  addLine(lines, "Title", bookmark.title);
  addLine(lines, "Domain", domain);
  addLine(lines, "User note", bookmark.note);
  addLine(lines, "Save reason", bookmark.save_reason);
  const colorMode = inferColorMode(bookmark);
  addLine(lines, "Color mode", colorMode);
  if (colorMode === "light interface") lines.push("Negative visual evidence: not a dark theme");
  if (colorMode === "dark interface") lines.push("Positive visual evidence: dark theme");
  addLine(lines, "Visual evidence", bookmark.ai_description || bookmark.summary || aiMetadata?.design_context);
  addLine(lines, "Page type", aiMetadata?.page_type);
  addLine(lines, "Industry", aiMetadata?.industry);
  addArrayLine(lines, "User tags", bookmark.tags);
  addSpecificArrayLine(lines, "Specific AI tags", bookmark.ai_tags?.length ? bookmark.ai_tags : aiMetadata?.suggested_tags);
  addSpecificArrayLine(lines, "Layout structure", bookmark.ai_patterns?.length ? bookmark.ai_patterns : aiMetadata?.ui_patterns);
  addSpecificArrayLine(lines, "Visual style", aiMetadata?.visual_style);
  addSpecificArrayLine(lines, "Notable UI details", aiMetadata?.components);
  addArrayLine(lines, "Fonts", bookmark.fonts);
  addSpecificArrayLine(lines, "Design DNA colors", designDna?.colors?.map((color) => `${color.name} ${color.usage}`), 8);
  addArrayLine(lines, "Design DNA typography", designDna?.typography?.map((font) => `${font.role} ${font.fontFamily} ${font.fontWeight}`));
  addArrayLine(lines, "Design DNA components", designDna?.components);
  addArrayLine(lines, "Design DNA layout patterns", designDna?.layout_patterns);

  const compactDna = compactJsonRecord(bookmark.ai_design_dna);
  if (compactDna.length) lines.push(`AI design DNA: ${compactDna.join("; ")}`);

  return lines.join("\n").slice(0, 8_000);
}

export function getBookmarkMemoryContentHash(memoryText: string): string {
  return crypto
    .createHash("sha256")
    .update(`bookmark-retrieval-schema:${BOOKMARK_RETRIEVAL_SCHEMA_VERSION}\n${memoryText}`)
    .digest("hex");
}

export function deriveMatchReasons(bookmark: BookmarkLike, query = ""): string[] {
  const q = query.toLowerCase();
  const reasons: string[] = [];
  const colorMode = inferColorMode(bookmark);

  if (colorMode === "light interface") reasons.push("Light interface");
  if (colorMode === "dark interface") reasons.push("Dark interface");

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
    .map((value) => String(value))
    .filter((value) => !GENERIC_RETRIEVAL_TERMS.has(value.toLowerCase()));

  const scored = candidates
    .map((value) => ({
      value,
      score: q && q.includes(value.toLowerCase().replace(/[-_]+/g, " ")) ? 2 : 1,
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ value }) => readableLabel(value));

  return Array.from(new Set([...reasons, ...scored])).slice(0, 3);
}
