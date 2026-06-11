import { GoogleGenAI, Type } from "@google/genai";
import sharp from "sharp";
import { z } from "zod";

const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash";

const MAX_VISUAL_STYLE = 8;
const MAX_UI_PATTERNS = 12;
const MAX_COMPONENTS = 12;
const MAX_SUGGESTED_TAGS = 15;
const MAX_DESIGN_CONTEXT_CHARS = 240;

const outputSchema = z.object({
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

const stringArraySchema = (maxItems) => ({
  type: Type.ARRAY,
  maxItems: String(maxItems),
  items: { type: Type.STRING },
});

const responseSchema = {
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
};

let geminiClient = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  geminiClient ??= new GoogleGenAI({ apiKey });
  return geminiClient;
}

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function toKebabCase(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/&/g, " and ")
    .replace(/ui\/ux/g, "ui-ux")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeArray(values, limit) {
  const seen = new Set();
  const normalized = [];

  for (const value of values ?? []) {
    const next = toKebabCase(value);
    if (!next || seen.has(next)) continue;
    seen.add(next);
    normalized.push(next);
    if (normalized.length >= limit) break;
  }

  return normalized;
}

function titleCaseFolder(value) {
  const cleaned = String(value ?? "").trim().replace(/[-_]+/g, " ").replace(/\s+/g, " ").slice(0, 80);
  if (!cleaned) return "UI References";
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

function normalizeOutput(output) {
  const parsed = outputSchema.parse(output);
  return outputSchema.parse({
    page_type: toKebabCase(parsed.page_type) || "unknown",
    industry: toKebabCase(parsed.industry) || "unknown",
    visual_style: normalizeArray(parsed.visual_style, MAX_VISUAL_STYLE),
    ui_patterns: normalizeArray(parsed.ui_patterns, MAX_UI_PATTERNS),
    components: normalizeArray(parsed.components, MAX_COMPONENTS),
    suggested_tags: normalizeArray(parsed.suggested_tags, MAX_SUGGESTED_TAGS),
    suggested_folder: titleCaseFolder(parsed.suggested_folder),
    design_context: parsed.design_context.trim().replace(/\s+/g, " ").slice(0, MAX_DESIGN_CONTEXT_CHARS),
    confidence: Math.min(1, Math.max(0, parsed.confidence)),
  });
}

function parseJson(text) {
  return JSON.parse(
    String(text ?? "")
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim()
  );
}

function buildPrompt(bookmark, observed) {
  return `You are Nyabag's screenshot-grounded design memory intelligence layer.

Analyze the attached bookmark screenshot as the visual source of truth.
Use observed DOM data for exact fonts, colors, labels, and layout signals.
Do not name fonts unless they appear in observed typography candidates.
Do not invent colors outside observed palettes/colors.

Return compact design metadata for a product/UI designer.
Focus only on UI layout, visual hierarchy, typography treatment, components, patterns, visual style, and retrieval tags.
Ignore business claims, sales copy, legal text, company history, and generic website description.

Input:
${JSON.stringify({ bookmark, observed })}

Return exact JSON:
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

export async function extractPaletteFromImage(imageBuffer, limit = 8) {
  const { data, info } = await sharp(imageBuffer)
    .resize({ width: 120, height: 120, fit: "inside", withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const buckets = new Map();

  for (let index = 0; index < data.length; index += info.channels) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);

    if (max > 246 || min < 8 || max - min < 10) continue;

    const key = [r, g, b].map((value) => Math.round(value / 24) * 24).join(",");
    const previous = buckets.get(key) ?? { count: 0, r: 0, g: 0, b: 0 };
    previous.count += 1;
    previous.r += r;
    previous.g += g;
    previous.b += b;
    buckets.set(key, previous);
  }

  const colors = Array.from(buckets.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((bucket) => {
      const r = Math.round(bucket.r / bucket.count);
      const g = Math.round(bucket.g / bucket.count);
      const b = Math.round(bucket.b / bucket.count);
      return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("").toUpperCase()}`;
    });

  return colors.length ? colors : ["#111827", "#F9FAFB"];
}

export async function upsertAiPending(supabase, job) {
  const { error } = await supabase
    .from("bookmark_ai_metadata")
    .upsert(
      {
        bookmark_id: job.bookmark_id,
        user_id: job.user_id,
        status: "pending",
        model_name: GEMINI_MODEL,
        error: null,
      },
      { onConflict: "bookmark_id" }
    );

  if (error) throw new Error(`Could not mark AI pending: ${error.message}`);
}

export async function upsertAiFailed(supabase, job, error) {
  const message = error instanceof Error ? error.message : String(error);
  const { error: upsertError } = await supabase
    .from("bookmark_ai_metadata")
    .upsert(
      {
        bookmark_id: job.bookmark_id,
        user_id: job.user_id,
        status: "failed",
        model_name: GEMINI_MODEL,
        error: message.slice(0, 500),
      },
      { onConflict: "bookmark_id" }
    );

  if (upsertError) {
    console.warn(`[processor] Could not mark AI failed: ${upsertError.message}`);
  }
}

export async function analyzeBookmarkScreenshot({ supabase, job, bookmark, screenshot, observed }) {
  if (!isGeminiConfigured()) {
    console.log("[processor] AI skipped: GEMINI_API_KEY is not configured");
    await upsertAiFailed(supabase, job, new Error("GEMINI_API_KEY is not configured"));
    return null;
  }

  await upsertAiPending(supabase, job);

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
              mimeType: "image/webp",
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

  const raw = parseJson(response.text);
  const enriched = normalizeOutput(raw);

  const { data, error } = await supabase
    .from("bookmark_ai_metadata")
    .upsert(
      {
        bookmark_id: job.bookmark_id,
        user_id: job.user_id,
        page_type: enriched.page_type,
        industry: enriched.industry,
        visual_style: enriched.visual_style,
        ui_patterns: enriched.ui_patterns,
        components: enriched.components,
        suggested_tags: enriched.suggested_tags,
        suggested_folder: enriched.suggested_folder,
        design_context: enriched.design_context,
        confidence: enriched.confidence,
        model_name: response.modelVersion || GEMINI_MODEL,
        raw_response: {
          gemini: raw,
          observed,
        },
        error: null,
        status: "completed",
      },
      { onConflict: "bookmark_id" }
    )
    .select()
    .single();

  if (error) throw new Error(`Could not save AI metadata: ${error.message}`);
  return data;
}
