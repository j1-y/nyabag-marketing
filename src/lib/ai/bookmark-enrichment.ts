import "server-only";

import { Type, type Schema } from "@google/genai";
import { z } from "zod";
import { getDomain } from "@/lib/data";
import type { Bookmark } from "@/lib/types";
import { GEMINI_MODEL, getGeminiClient } from "./gemini";

const MAX_VISUAL_STYLE = 8;
const MAX_UI_PATTERNS = 12;
const MAX_COMPONENTS = 12;
const MAX_SUGGESTED_TAGS = 15;

export const bookmarkAiOutputSchema = z.object({
  page_type: z.string().trim().max(80).default("unknown"),
  industry: z.string().trim().max(80).default("unknown"),
  visual_style: z.array(z.string().trim().max(80)).max(MAX_VISUAL_STYLE).default([]),
  ui_patterns: z.array(z.string().trim().max(80)).max(MAX_UI_PATTERNS).default([]),
  components: z.array(z.string().trim().max(80)).max(MAX_COMPONENTS).default([]),
  suggested_tags: z.array(z.string().trim().max(80)).max(MAX_SUGGESTED_TAGS).default([]),
  suggested_folder: z.string().trim().max(80).default(""),
  design_context: z.string().trim().max(700).default(""),
  confidence: z.coerce.number().min(0).max(1).default(0),
});

export type BookmarkAiOutput = z.infer<typeof bookmarkAiOutputSchema>;

export type BookmarkAiResult = BookmarkAiOutput & {
  model_name: string;
  raw_response: unknown;
};

const stringArraySchema = (maxItems: number): Schema => ({
  type: Type.ARRAY,
  maxItems: String(maxItems),
  items: { type: Type.STRING },
});

const responseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    page_type: { type: Type.STRING, maxLength: "80" },
    industry: { type: Type.STRING, maxLength: "80" },
    visual_style: stringArraySchema(MAX_VISUAL_STYLE),
    ui_patterns: stringArraySchema(MAX_UI_PATTERNS),
    components: stringArraySchema(MAX_COMPONENTS),
    suggested_tags: stringArraySchema(MAX_SUGGESTED_TAGS),
    suggested_folder: { type: Type.STRING, maxLength: "80" },
    design_context: { type: Type.STRING, maxLength: "700" },
    confidence: { type: Type.NUMBER, minimum: 0, maximum: 1 },
  },
  required: [
    "page_type",
    "industry",
    "visual_style",
    "ui_patterns",
    "components",
    "suggested_tags",
    "suggested_folder",
    "design_context",
    "confidence",
  ],
  propertyOrdering: [
    "page_type",
    "industry",
    "visual_style",
    "ui_patterns",
    "components",
    "suggested_tags",
    "suggested_folder",
    "design_context",
    "confidence",
  ],
};

function toKebabCase(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeArray(values: string[], limit: number, kebab = true) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const next = kebab ? toKebabCase(value) : value.trim().toLowerCase();
    if (!next || seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
    if (normalized.length >= limit) break;
  }

  return normalized;
}

function normalizeOutput(output: BookmarkAiOutput): BookmarkAiOutput {
  return {
    page_type: output.page_type.trim() || "unknown",
    industry: output.industry.trim() || "unknown",
    visual_style: normalizeArray(output.visual_style, MAX_VISUAL_STYLE),
    ui_patterns: normalizeArray(output.ui_patterns, MAX_UI_PATTERNS),
    components: normalizeArray(output.components, MAX_COMPONENTS),
    suggested_tags: normalizeArray(output.suggested_tags, MAX_SUGGESTED_TAGS),
    suggested_folder: output.suggested_folder.trim().slice(0, 80),
    design_context: output.design_context.trim().slice(0, 700),
    confidence: Math.min(1, Math.max(0, output.confidence)),
  };
}

function parseJson(text: string) {
  const trimmed = text.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  return JSON.parse(unfenced) as unknown;
}

function buildPrompt(bookmark: Bookmark) {
  const input = {
    url: bookmark.url,
    domain: getDomain(bookmark.url),
    title: bookmark.title,
    summary: bookmark.summary,
    note: bookmark.note,
    tags: bookmark.tags,
    palette: bookmark.palette,
    fonts: bookmark.fonts,
  };

  return `You are Nyabag's design memory intelligence layer.
Nyabag is a personal second memory for design.
Analyze this saved design reference for a product/UI designer.
Return structured metadata only.
Do not invent facts that are not supported.
Focus on visual, product, UI, UX, and design usefulness.
Use concise tags and patterns that help a designer find this reference later.

Input data:
${JSON.stringify(input, null, 2)}

Output JSON:
{
  "page_type": "SaaS landing page | portfolio | dashboard | pricing page | design inspiration directory | blog/article | documentation | ecommerce page | mobile app page | unknown",
  "industry": "short industry/category",
  "visual_style": ["minimal", "dark-ui", "high-contrast"],
  "ui_patterns": ["hero-section", "pricing-cards", "bento-grid"],
  "components": ["navbar", "cta", "cards"],
  "suggested_tags": ["saas", "landing-page", "hero"],
  "suggested_folder": "Landing Pages",
  "design_context": "One or two sentence explanation of why this reference is useful for design memory.",
  "confidence": 0.82
}

Output rules:
- Use kebab-case for tags, patterns, and components.
- No more than 15 suggested_tags.
- No more than 12 ui_patterns.
- No more than 12 components.
- No more than 8 visual_style values.
- design_context must be under 700 characters.
- confidence must be 0 to 1.
- If unsure, use unknown or lower confidence.
- Do not include markdown.
- Return JSON only.`;
}

export async function enrichBookmarkDesignMetadata(bookmark: Bookmark): Promise<BookmarkAiResult> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: buildPrompt(bookmark),
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.2,
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  const raw = parseJson(text);
  const parsed = bookmarkAiOutputSchema.parse(raw);
  const normalized = bookmarkAiOutputSchema.parse(normalizeOutput(parsed));

  return {
    ...normalized,
    model_name: response.modelVersion || GEMINI_MODEL,
    raw_response: raw,
  };
}
