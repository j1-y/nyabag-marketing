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
const MAX_DESIGN_CONTEXT_CHARS = 240;

const PREFERRED_PAGE_TYPES = new Set([
  "saas-landing-page",
  "portfolio",
  "dashboard",
  "pricing-page",
  "design-inspiration-directory",
  "blog-article",
  "documentation",
  "ecommerce-page",
  "mobile-app-page",
  "checkout-flow",
  "onboarding-flow",
  "settings-page",
  "profile-page",
  "search-results-page",
  "gallery-page",
  "case-study-page",
  "unknown",
]);

const PREFERRED_FOLDERS = new Set([
  "Landing Pages",
  "Dashboards",
  "Pricing Pages",
  "Portfolios",
  "Mobile UI",
  "Forms",
  "Navigation",
  "Design Systems",
  "Ecommerce",
  "Onboarding",
  "Inspiration Boards",
  "Documentation",
  "Case Studies",
  "UI References",
]);

export const bookmarkAiOutputSchema = z.object({
  page_type: z.string().trim().max(80).default("unknown"),
  industry: z.string().trim().max(80).default("unknown"),
  visual_style: z.array(z.string().trim().max(80)).max(MAX_VISUAL_STYLE).default([]),
  ui_patterns: z.array(z.string().trim().max(80)).max(MAX_UI_PATTERNS).default([]),
  components: z.array(z.string().trim().max(80)).max(MAX_COMPONENTS).default([]),
  suggested_tags: z.array(z.string().trim().max(80)).max(MAX_SUGGESTED_TAGS).default([]),
  suggested_folder: z.string().trim().max(80).default(""),
  design_context: z.string().trim().max(MAX_DESIGN_CONTEXT_CHARS).default(""),
  confidence: z.coerce.number().min(0).max(1).default(0),
});

export type BookmarkAiOutput = z.infer<typeof bookmarkAiOutputSchema>;

export type ObservedDesignData = {
  metadata?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  colors?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  screenshot?: Record<string, unknown>;
};

export type BookmarkAiResult = BookmarkAiOutput & {
  model_name: string;
  raw_response: unknown;
};

export type ScreenshotBookmarkAiInput = {
  bookmark: Bookmark;
  screenshot: Buffer;
  mimeType?: string;
  observed?: ObservedDesignData | null;
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
    design_context: { type: Type.STRING, maxLength: String(MAX_DESIGN_CONTEXT_CHARS) },
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
    .replace(/ui\/ux/g, "ui-ux")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toTitleCaseFolder(value: string) {
  const cleaned = value.trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ").slice(0, 80);
  if (!cleaned) return "";

  return cleaned
    .split(" ")
    .map((word) => {
      const lower = word.toLowerCase();
      if (lower === "ui") return "UI";
      if (lower === "ux") return "UX";
      if (lower === "saas") return "SaaS";
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(" ");
}

function normalizeArray(values: string[], limit: number) {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const next = toKebabCase(value);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
    if (normalized.length >= limit) break;
  }

  return normalized;
}

function normalizePageType(value: string) {
  const pageType = toKebabCase(value);
  if (!pageType) return "unknown";
  if (PREFERRED_PAGE_TYPES.has(pageType)) return pageType;
  return pageType.slice(0, 80);
}

function normalizeSuggestedFolder(value: string, pageType: string, tags: string[]) {
  const folder = toTitleCaseFolder(value);
  if (folder && PREFERRED_FOLDERS.has(folder)) return folder;
  if (pageType.includes("dashboard")) return "Dashboards";
  if (pageType.includes("pricing")) return "Pricing Pages";
  if (pageType.includes("portfolio")) return "Portfolios";
  if (pageType.includes("mobile") || tags.some((tag) => tag.includes("mobile"))) return "Mobile UI";
  if (pageType.includes("onboarding")) return "Onboarding";
  if (pageType.includes("documentation")) return "Documentation";
  if (pageType.includes("ecommerce") || pageType.includes("checkout")) return "Ecommerce";
  if (pageType.includes("case-study")) return "Case Studies";
  if (pageType.includes("landing")) return "Landing Pages";
  return folder || "UI References";
}

function normalizeOutput(output: BookmarkAiOutput): BookmarkAiOutput {
  const pageType = normalizePageType(output.page_type);
  const suggestedTags = normalizeArray(output.suggested_tags, MAX_SUGGESTED_TAGS);

  return {
    page_type: pageType,
    industry: toKebabCase(output.industry || "unknown") || "unknown",
    visual_style: normalizeArray(output.visual_style, MAX_VISUAL_STYLE),
    ui_patterns: normalizeArray(output.ui_patterns, MAX_UI_PATTERNS),
    components: normalizeArray(output.components, MAX_COMPONENTS),
    suggested_tags: suggestedTags,
    suggested_folder: normalizeSuggestedFolder(output.suggested_folder, pageType, suggestedTags),
    design_context: output.design_context.trim().replace(/\s+/g, " ").slice(0, MAX_DESIGN_CONTEXT_CHARS),
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

function buildPrompt(bookmark: Bookmark, observed: ObservedDesignData | null | undefined) {
  const input = {
    url: bookmark.url,
    domain: getDomain(bookmark.url),
    title: bookmark.title,
    summary: bookmark.summary,
    note: bookmark.note,
    existing_tags: bookmark.tags,
    observed_design_data: observed ?? {
      palette: bookmark.palette,
      fonts: bookmark.fonts,
      source: "bookmark-record-only",
    },
  };

  return `You are Nyabag's screenshot-grounded design memory intelligence layer.

Analyze the attached bookmark screenshot as the visual source of truth.
Use the provided observed DOM data for exact fonts, colors, labels, and layout signals.
Do not identify fonts unless they appear in observed DOM font candidates.
Do not invent colors outside the observed palette/colors.

Return compact design metadata for a product/UI designer.
Focus only on UI layout, visual hierarchy, typography treatment, components, patterns, and retrieval tags.
Ignore business claims, sales copy, legal text, and company history.

Input:
${JSON.stringify(input)}

Return this exact JSON shape:
{
  "page_type": "saas-landing-page",
  "industry": "design-tools",
  "visual_style": ["dark-ui", "minimal"],
  "ui_patterns": ["hero-section", "card-grid"],
  "components": ["navbar", "cta", "cards"],
  "suggested_tags": ["saas", "hero-section", "dark-ui"],
  "suggested_folder": "Landing Pages",
  "design_context": "Useful for studying dark SaaS hero hierarchy, CTA placement, and card-grid structure.",
  "confidence": 0.86
}

Rules:
- Use kebab-case for arrays and page_type/industry.
- Keep values short and design-specific.
- design_context under ${MAX_DESIGN_CONTEXT_CHARS} characters.
- If unsure, use "unknown" or an empty array.
- Return JSON only.`;
}

export async function enrichBookmarkDesignMetadataFromScreenshot({
  bookmark,
  screenshot,
  mimeType = "image/webp",
  observed,
}: ScreenshotBookmarkAiInput): Promise<BookmarkAiResult> {
  const ai = getGeminiClient();

  const response = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(bookmark, observed) },
          {
            inlineData: {
              mimeType,
              data: screenshot.toString("base64"),
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0.1,
      topP: 0.85,
      topK: 24,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");

  const raw = parseJson(text);
  const parsed = bookmarkAiOutputSchema.parse(raw);
  const normalized = bookmarkAiOutputSchema.parse(normalizeOutput(parsed));

  return {
    ...normalized,
    model_name: response.modelVersion || GEMINI_MODEL,
    raw_response: {
      gemini: raw,
      observed: observed ?? null,
    },
  };
}
